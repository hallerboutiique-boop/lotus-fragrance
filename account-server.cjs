'use strict';
const http=require('node:http');
const {DatabaseSync}=require('node:sqlite');
const {randomBytes,createHash,scrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const derive=promisify(scrypt);
const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const TTL=7*24*60*60*1000;
function createAccountServer({databasePath,origin,secure=true,trustFly=false,rateLimit=30}={}){
 if(!databasePath||!origin)throw Error('Database and origin are required');
 if(databasePath!==':memory:')mkdirSync(path.dirname(databasePath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(databasePath,{timeout:5000});
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL,created INTEGER NOT NULL,full_name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',address TEXT NOT NULL DEFAULT '',city TEXT NOT NULL DEFAULT '',postal_code TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 const profileColumns=new Set(db.prepare('PRAGMA table_info(users)').all().map(column=>column.name));
 for(const [name,definition] of [['full_name',"TEXT NOT NULL DEFAULT ''"],['phone',"TEXT NOT NULL DEFAULT ''"],['address',"TEXT NOT NULL DEFAULT ''"],['city',"TEXT NOT NULL DEFAULT ''"],['postal_code',"TEXT NOT NULL DEFAULT ''"]])if(!profileColumns.has(name))db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
 const cookieName=secure?'__Host-lotus-session':'lotus-session';
 const cookie=(value,age=TTL/1000)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 async function encodePassword(password){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return salt+':'+key.toString('hex')}
 async function checkPassword(password,encoded){const [salt,key]=encoded.split(':');const actual=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return timingSafeEqual(actual,Buffer.from(key,'hex'))}
 // Missing accounts still take one password derivation to reduce enumeration.
 const dummy=randomBytes(16).toString('hex')+':'+randomBytes(64).toString('hex');
 const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128;
 const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
 const validEmail=value=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 function session(req){const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?db.prepare('SELECT users.id,users.email,users.created FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?').get(hash(value),Date.now()):null}
 function allow(key,max){const now=Date.now();db.prepare('DELETE FROM limits WHERE expires<?').run(now);db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(hash(key),now+15*60*1000);return db.prepare('SELECT count FROM limits WHERE key=?').get(hash(key)).count<=max}
 function newSession(res,userId){const value=token();db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(value),userId,Date.now()+TTL);res.setHeader('Set-Cookie',cookie(value))}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)throw Error('BODY_LIMIT')}return JSON.parse(text)}
 const staticFiles={'/':'account.html','/account.html':'account.html','/account.js':'account.js','/account.css':'account.css','/account-page.css':'account-page.css','/brand-logo.css':'brand-logo.css','/i18n.js':'i18n.js','/i18n-data.js':'i18n-data.js','/i18n.css':'i18n.css','/assets/lotus-logo.png':'assets/lotus-logo.png'};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  res.setHeader('Cache-Control','no-store');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
  try{
   const pathname=new URL(req.url,origin).pathname;
   if(pathname==='/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(200,{ok:true})}
   if(req.method==='GET'&&staticFiles[pathname]){const file=staticFiles[pathname];res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'image/png');return res.end(readFileSync(path.join(__dirname,file)))}
   if(!pathname.startsWith('/api/'))return send(404,{error:'not_found'});
   if(req.method==='GET'&&pathname==='/api/me'){const user=session(req);return send(user?200:401,user?{user:{email:user.email,created:user.created}}:{error:'unauthorized'})}
   if(req.method==='GET'&&pathname==='/api/profile'){const current=session(req);if(!current)return send(401,{error:'unauthorized'});const profile=db.prepare('SELECT email,created,full_name,phone,address,city,postal_code FROM users WHERE id=?').get(current.id);return send(200,{profile})}
   if(req.method!=='POST')return send(405,{error:'method'});
   // Same-origin JSON requests only; do not enable wildcard CORS.
   if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(403,{error:'origin'});
   const ip=trustFly?(req.headers['fly-client-ip']||req.socket.remoteAddress):req.socket.remoteAddress;
   if(!allow('ip:'+ip,rateLimit)){res.setHeader('Retry-After','900');return send(429,{error:'rate'})}
   const input=await body(req),email=emailOf(input.email);
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
module.exports={createAccountServer};
if(require.main===module){const origin=process.env.PUBLIC_ORIGIN;if(!origin?.startsWith('https://'))throw Error('HTTPS PUBLIC_ORIGIN required');createAccountServer({databasePath:process.env.DATABASE_PATH||'/data/accounts.sqlite',origin,trustFly:true}).listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Lotus account service ready'))}
