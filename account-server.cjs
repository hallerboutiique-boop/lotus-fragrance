'use strict';
const http=require('node:http');
const {DatabaseSync}=require('node:sqlite');
const {randomBytes,createHash,createHmac,scrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const orderCatalog=JSON.parse(readFileSync(path.join(__dirname,'products.json'),'utf8')).products;
const derive=promisify(scrypt);
const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const TTL=7*24*60*60*1000;
function verifyStripeSignature(payload,header,secret,now=Math.floor(Date.now()/1000)){
 if(!secret||!Buffer.isBuffer(payload)||typeof header!=='string')return false;
 const values=header.split(',').map(part=>part.split('=',2));
 const timestamp=Number(values.find(([key])=>key==='t')?.[1]);
 if(!Number.isInteger(timestamp)||Math.abs(now-timestamp)>300)return false;
 const expected=createHmac('sha256',secret).update(`${timestamp}.`).update(payload).digest();
 return values.filter(([key])=>key==='v1').some(([,value])=>{if(!/^[a-f0-9]{64}$/i.test(value||''))return false;const actual=Buffer.from(value,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)});
}
async function rawBody(req,limit=1024*1024){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>limit)throw Error('BODY_LIMIT');chunks.push(chunk)}return Buffer.concat(chunks,length)}
function createAccountServer({databasePath,origin,secure=true,trustFly=false,rateLimit=30,stripeWebhookSecret=process.env.STRIPE_WEBHOOK_SECRET,adminPasswordHash=process.env.ADMIN_PASSWORD_HASH}={}){
 if(!databasePath||!origin)throw Error('Database and origin are required');
 if(databasePath!==':memory:')mkdirSync(path.dirname(databasePath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(databasePath,{timeout:5000});
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL,created INTEGER NOT NULL,full_name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',address TEXT NOT NULL DEFAULT '',city TEXT NOT NULL DEFAULT '',postal_code TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_sessions(token TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_credentials(id INTEGER PRIMARY KEY CHECK(id=1),password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(stripe_session_id TEXT PRIMARY KEY,email TEXT NOT NULL,total_cents INTEGER NOT NULL,currency TEXT NOT NULL,items_summary TEXT NOT NULL,status TEXT NOT NULL,tracking_code TEXT NOT NULL DEFAULT '',recipient_name TEXT NOT NULL DEFAULT '',address_line1 TEXT NOT NULL DEFAULT '',address_line2 TEXT NOT NULL DEFAULT '',city TEXT NOT NULL DEFAULT '',postal_code TEXT NOT NULL DEFAULT '',country TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS orders_email_created ON orders(email,created DESC);
 CREATE TABLE IF NOT EXISTS stripe_events(id TEXT PRIMARY KEY,created INTEGER NOT NULL);`);
 const profileColumns=new Set(db.prepare('PRAGMA table_info(users)').all().map(column=>column.name));
 for(const [name,definition] of [['full_name',"TEXT NOT NULL DEFAULT ''"],['phone',"TEXT NOT NULL DEFAULT ''"],['address',"TEXT NOT NULL DEFAULT ''"],['city',"TEXT NOT NULL DEFAULT ''"],['postal_code',"TEXT NOT NULL DEFAULT ''"]])if(!profileColumns.has(name))db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
 const cookieName=secure?'__Host-lotus-session':'lotus-session';
 const adminCookieName=secure?'__Host-lotus-admin':'lotus-admin';
 const cookie=(value,age=TTL/1000)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 const adminCookie=(value,age=8*60*60)=>`${adminCookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 async function encodePassword(password){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return salt+':'+key.toString('hex')}
 async function checkPassword(password,encoded){const [salt,key]=encoded.split(':');const actual=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return timingSafeEqual(actual,Buffer.from(key,'hex'))}
 const configuredAdminHash=adminPasswordHash||'';
 if(/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(configuredAdminHash))db.prepare('INSERT INTO admin_credentials(id,password) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET password=excluded.password').run(configuredAdminHash);
 // Missing accounts still take one password derivation to reduce enumeration.
 const dummy=randomBytes(16).toString('hex')+':'+randomBytes(64).toString('hex');
 const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128;
 const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
 const validEmail=value=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 function session(req){const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?db.prepare('SELECT users.id,users.email,users.created FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?').get(hash(value),Date.now()):null}
 function adminSession(req){const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(adminCookieName+'='))?.slice(adminCookieName.length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?db.prepare('SELECT token FROM admin_sessions WHERE token=? AND expires>?').get(hash(value),Date.now()):null}
 function allow(key,max){const now=Date.now();db.prepare('DELETE FROM limits WHERE expires<?').run(now);db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(hash(key),now+15*60*1000);return db.prepare('SELECT count FROM limits WHERE key=?').get(hash(key)).count<=max}
 function newSession(res,userId){const value=token();db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(value),userId,Date.now()+TTL);res.setHeader('Set-Cookie',cookie(value))}
 function newAdminSession(res){const value=token();db.prepare('DELETE FROM admin_sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO admin_sessions VALUES(?,?)').run(hash(value),Date.now()+8*60*60*1000);res.setHeader('Set-Cookie',adminCookie(value))}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)throw Error('BODY_LIMIT')}return JSON.parse(text)}
 const staticFiles={'/':'account.html','/account.html':'account.html','/account.js':'account.js','/account.css':'account.css','/account-page.css':'account-page.css','/brand-logo.css':'brand-logo.css','/i18n.js':'i18n.js','/i18n-data.js':'i18n-data.js','/i18n.css':'i18n.css','/assets/lotus-logo.png':'assets/lotus-logo.png','/admin':'admin-app.html','/admin.html':'admin-app.html','/admin-app.js':'admin-app.js','/admin-app.css':'admin-app.css','/admin-extra.css':'admin-extra.css'};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  res.setHeader('Cache-Control','no-store');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
  try{
   const pathname=new URL(req.url,origin).pathname;
   if(pathname==='/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(200,{ok:true})}
   if(pathname==='/api/stripe-webhook'&&req.method==='POST'){
    const secret=stripeWebhookSecret;
    if(!secret)return send(503,{error:'webhook_not_configured'});
    const raw=await rawBody(req);if(!verifyStripeSignature(raw,req.headers['stripe-signature'],secret))return send(400,{error:'invalid_signature'});
    let event;try{event=JSON.parse(raw.toString('utf8'))}catch{return send(400,{error:'invalid_event'})}
    if(!event?.id||event.livemode!==true)return send(400,{error:'invalid_event'});
    if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return send(200,{received:true});
    const checkout=event.data?.object;
    if(checkout?.object!=='checkout.session'||checkout.payment_status!=='paid')return send(200,{received:true});
    const email=String(checkout.customer_details?.email||checkout.customer_email||'').trim().toLowerCase();
    const total=checkout.amount_total,itemCodes=String(checkout.metadata?.item_ids||'').split(','),shipping=checkout.shipping_details||checkout.shipping||{},address=shipping.address||{};
    const itemIds=itemCodes.map(code=>/^[0-9a-z]$/.test(code)?orderCatalog[parseInt(code,36)]?.id:null);
    if(!/^\S+@\S+\.\S+$/.test(email)||!Number.isSafeInteger(total)||total<1||!itemCodes.length||itemIds.some(id=>!id)||typeof checkout.id!=='string')return send(400,{error:'invalid_order'});
    const summary=itemIds.map(id=>orderCatalog.find(product=>product.id===id).name).join(' · ').slice(0,4500);
    db.exec('BEGIN IMMEDIATE');try{
     const inserted=db.prepare('INSERT OR IGNORE INTO stripe_events(id,created) VALUES(?,?)').run(event.id,Date.now());
     if(inserted.changes===0){db.exec('COMMIT');return send(200,{received:true,deduplicated:true})}
     const now=Date.now();
     db.prepare(`INSERT INTO orders(stripe_session_id,email,total_cents,currency,items_summary,status,recipient_name,address_line1,address_line2,city,postal_code,country,created,updated)
      VALUES(?,?,?,?,?,'paid',?,?,?,?,?,?,?,?) ON CONFLICT(stripe_session_id) DO UPDATE SET email=excluded.email,total_cents=excluded.total_cents,currency=excluded.currency,items_summary=excluded.items_summary,status='paid',recipient_name=excluded.recipient_name,address_line1=excluded.address_line1,address_line2=excluded.address_line2,city=excluded.city,postal_code=excluded.postal_code,country=excluded.country,updated=excluded.updated`)
      .run(checkout.id,email,total,String(checkout.currency||'eur').toUpperCase(),summary,String(shipping.name||checkout.customer_details?.name||'').slice(0,160),String(address.line1||'').slice(0,160),String(address.line2||'').slice(0,160),String(address.city||'').slice(0,100),String(address.postal_code||'').slice(0,20),String(address.country||'').slice(0,2),now,now);
     db.exec('COMMIT');return send(200,{received:true});
    }catch(error){db.exec('ROLLBACK');throw error}
   }
   if(req.method==='GET'&&staticFiles[pathname]){const file=staticFiles[pathname];res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'image/png');return res.end(readFileSync(path.join(__dirname,file)))}
   if(!pathname.startsWith('/api/'))return send(404,{error:'not_found'});
   if(req.method==='GET'&&pathname==='/api/me'){const user=session(req);return send(user?200:401,user?{user:{email:user.email,created:user.created}}:{error:'unauthorized'})}
   if(req.method==='GET'&&pathname==='/api/profile'){const current=session(req);if(!current)return send(401,{error:'unauthorized'});const profile=db.prepare('SELECT email,created,full_name,phone,address,city,postal_code FROM users WHERE id=?').get(current.id);return send(200,{profile})}
   if(req.method==='GET'&&pathname==='/api/orders'){const current=session(req);if(!current)return send(401,{error:'unauthorized'});const orders=db.prepare('SELECT stripe_session_id,total_cents,currency,items_summary,status,tracking_code,created,updated FROM orders WHERE email=? ORDER BY created DESC LIMIT 100').all(current.email);return send(200,{orders:orders.map(order=>({id:order.stripe_session_id,totalCents:order.total_cents,currency:order.currency,itemsSummary:order.items_summary,status:order.status,trackingCode:order.tracking_code||null,created:order.created,updated:order.updated}))})}
   if(req.method==='GET'&&pathname==='/api/admin/session'){const current=adminSession(req);return send(current?200:401,{authenticated:Boolean(current)})}
   if(req.method==='GET'&&pathname==='/api/admin/dashboard'){
    if(!adminSession(req))return send(401,{error:'unauthorized'});
    const midnight=new Date();midnight.setUTCHours(0,0,0,0);
    const metrics=db.prepare(`SELECT COUNT(*) AS total_orders,COALESCE(SUM(CASE WHEN status!='cancelled' THEN total_cents ELSE 0 END),0) AS revenue_cents,SUM(CASE WHEN status IN ('paid','processing') THEN 1 ELSE 0 END) AS to_fulfil,COUNT(DISTINCT email) AS customers FROM orders WHERE currency='EUR'`).get();
    const today=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(total_cents),0) AS cents FROM orders WHERE currency='EUR' AND status!='cancelled' AND created>=?`).get(midnight.getTime());
    const orders=db.prepare(`SELECT stripe_session_id,email,total_cents,currency,items_summary,status,tracking_code,recipient_name,address_line1,address_line2,city,postal_code,country,created,updated FROM orders ORDER BY created DESC LIMIT 200`).all();
    const customers=db.prepare(`SELECT u.email,COALESCE(NULLIF(u.full_name,''),NULLIF(MAX(o.recipient_name),''),'Cliente') AS name,u.created AS account_created,COUNT(o.stripe_session_id) AS order_count,COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.total_cents ELSE 0 END),0) AS spend_cents
     FROM users u LEFT JOIN orders o ON o.email=u.email GROUP BY u.id
     UNION ALL
     SELECT o.email,COALESCE(NULLIF(MAX(o.recipient_name),''),'Cliente') AS name,NULL AS account_created,COUNT(*) AS order_count,COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.total_cents ELSE 0 END),0) AS spend_cents
     FROM orders o LEFT JOIN users u ON u.email=o.email WHERE u.id IS NULL GROUP BY o.email ORDER BY order_count DESC LIMIT 500`).all();
    const catalog=orderCatalog.map(({id,name,brand,category,image,price,size,availability,miniature})=>({id,name,brand,category,image,price,size,availability,miniature:miniature?{size:miniature.size,price:miniature.price,availability:miniature.availability}:null}));
    return send(200,{metrics:{totalOrders:metrics.total_orders,revenueCents:metrics.revenue_cents,toFulfil:metrics.to_fulfil||0,customers:metrics.customers,todayOrders:today.count,todayCents:today.cents},orders:orders.map(o=>({id:o.stripe_session_id,email:o.email,totalCents:o.total_cents,currency:o.currency,itemsSummary:o.items_summary,status:o.status,trackingCode:o.tracking_code||'',recipientName:o.recipient_name,addressLine1:o.address_line1,addressLine2:o.address_line2,city:o.city,postalCode:o.postal_code,country:o.country,created:o.created,updated:o.updated})),customers:customers.map(c=>({email:c.email,name:c.name,accountCreated:c.account_created,orderCount:c.order_count,spendCents:c.spend_cents})),products:catalog});
   }
   if(req.method!=='POST')return send(405,{error:'method'});
   // Same-origin JSON requests only; do not enable wildcard CORS.
   if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(403,{error:'origin'});
   const ip=trustFly?(req.headers['fly-client-ip']||req.socket.remoteAddress):req.socket.remoteAddress;
   if(!allow('ip:'+ip,rateLimit)){res.setHeader('Retry-After','900');return send(429,{error:'rate'})}
   const input=await body(req),email=emailOf(input.email);
   if(pathname==='/api/admin/login'){
    if(typeof input.password!=='string'||input.password.length>128)return send(400,{error:'credentials'});
    if(!allow('admin-login:'+ip,6)){res.setHeader('Retry-After','900');return send(429,{error:'rate'})}
    const stored=db.prepare('SELECT password FROM admin_credentials WHERE id=1').get();
    if(!stored)return send(503,{error:'admin_not_configured'});
    const valid=await checkPassword(input.password,stored.password);
    if(!valid)return send(401,{error:'credentials'});
    newAdminSession(res);return send(200,{ok:true});
   }
   if(pathname==='/api/admin/logout'){
    const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(adminCookieName+'='))?.slice(adminCookieName.length+1);
    if(value)db.prepare('DELETE FROM admin_sessions WHERE token=?').run(hash(value));res.setHeader('Set-Cookie',adminCookie('',0));return send(200,{ok:true});
   }
   if(pathname==='/api/admin/order'){
    if(!adminSession(req))return send(401,{error:'unauthorized'});
    const allowedStatuses=['paid','processing','shipped','completed','cancelled'];
    if(typeof input.id!=='string'||input.id.length>255||!allowedStatuses.includes(input.status)||typeof input.trackingCode!=='string'||input.trackingCode.length>120||/[<>\u0000-\u001f]/.test(input.trackingCode))return send(400,{error:'order'});
    const updated=db.prepare('UPDATE orders SET status=?,tracking_code=?,updated=? WHERE stripe_session_id=?').run(input.status,input.trackingCode.trim(),Date.now(),input.id);
    if(!updated.changes)return send(404,{error:'order_not_found'});
    return send(200,{ok:true});
   }
   if(['/api/register','/api/login','/api/recover'].includes(pathname)){
    if(!validEmail(email)||typeof input.password!=='string'||input.password.length>128)return send(400,{error:'invalid'});
    if(!allow('email:'+email,15))return send(429,{error:'rate'});
   }
   if(pathname==='/api/register'){
    if(!validPassword(input.password))return send(400,{error:'password'});
    const password=await encodePassword(input.password),recoveryCode=token(),id=token();
    // A duplicate email never authenticates or overwrites an existing account.
    try{db.prepare('INSERT INTO users(id,email,password,recovery,created) VALUES(?,?,?,?,?)').run(id,email,password,hash(recoveryCode),Date.now())}catch(error){if(error.code?.startsWith('ERR_SQLITE')||error.message.includes('UNIQUE'))return send(409,{error:'registration'});throw error}
    newSession(res,id);return send(201,{user:{email},recoveryCode});
   }
   if(pathname==='/api/login'){
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const matches=await checkPassword(input.password,user?.password||dummy);
    if(!user||!matches)return send(401,{error:'credentials'});
    newSession(res,user.id);return send(200,{user:{email:user.email}});
   }
   if(pathname==='/api/logout'){
    const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(value)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(value));res.setHeader('Set-Cookie',cookie('',0));return send(200,{ok:true});
   }
   if(pathname==='/api/profile'){
    const current=session(req);if(!current)return send(401,{error:'unauthorized'});
    const fields={full_name:input.fullName,phone:input.phone,address:input.address,city:input.city,postal_code:input.postalCode};
    const limits={full_name:100,phone:30,address:160,city:100,postal_code:20};
    for(const [key,value] of Object.entries(fields))if(typeof value!=='string'||value.length>limits[key]||/[<>\u0000-\u001f]/.test(value))return send(400,{error:'profile'});
    db.prepare('UPDATE users SET full_name=?,phone=?,address=?,city=?,postal_code=? WHERE id=?').run(fields.full_name.trim(),fields.phone.trim(),fields.address.trim(),fields.city.trim(),fields.postal_code.trim(),current.id);
    return send(200,{profile:{email:current.email,fullName:fields.full_name.trim(),phone:fields.phone.trim(),address:fields.address.trim(),city:fields.city.trim(),postalCode:fields.postal_code.trim()}});
   }
   if(pathname==='/api/recover'){
    if(!validPassword(input.password)||typeof input.recoveryCode!=='string'||input.recoveryCode.length>100)return send(400,{error:'invalid'});
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const expected=Buffer.from(user?.recovery||hash(token()),'hex'),actual=Buffer.from(hash(input.recoveryCode),'hex');
    if(!timingSafeEqual(expected,actual)||!user)return send(401,{error:'recovery'});
    const password=await encodePassword(input.password),recoveryCode=token();
    // Recheck in an atomic transaction: a recovery code can be used only once.
    db.exec('BEGIN IMMEDIATE');try{
     const update=db.prepare('UPDATE users SET password=?,recovery=? WHERE id=? AND recovery=?').run(password,hash(recoveryCode),user.id,hash(input.recoveryCode));
     if(update.changes!==1){db.exec('ROLLBACK');return send(401,{error:'recovery'})}
     db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error}
    newSession(res,user.id);return send(200,{user:{email},recoveryCode});
   }
   if(pathname==='/api/delete'){
    const current=session(req);if(!current)return send(401,{error:'unauthorized'});
    if(typeof input.password!=='string'||input.password.length>128)return send(400,{error:'invalid'});
    const user=db.prepare('SELECT * FROM users WHERE id=?').get(current.id);
    if(!await checkPassword(input.password,user.password))return send(401,{error:'credentials'});
    db.prepare('DELETE FROM users WHERE id=?').run(user.id);res.setHeader('Set-Cookie',cookie('',0));return send(200,{ok:true});
   }
   return send(404,{error:'not_found'});
  }catch(error){if(error instanceof SyntaxError||error.message==='BODY_LIMIT')return send(400,{error:'invalid'});console.error('Account request failed',error.code||error.name);if(!res.headersSent)send(500,{error:'server'});else res.end()}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.on('close',()=>db.close());
 return server;
}
module.exports={createAccountServer,verifyStripeSignature};
if(require.main===module){const origin=process.env.PUBLIC_ORIGIN;if(!origin?.startsWith('https://'))throw Error('HTTPS PUBLIC_ORIGIN required');createAccountServer({databasePath:process.env.DATABASE_PATH||'/data/accounts.sqlite',origin,trustFly:true}).listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Lotus account service ready'))}
