'use strict';
const assert=require('node:assert/strict');
const {createHmac,randomBytes,scryptSync}=require('node:crypto');
const {createAccountServer}=require('./account-server.cjs');

async function main(){
 const origin='http://127.0.0.1';
 const webhookSecret='whsec_test_unit';
 const adminPassword='lotus-admin-test-password';const adminSalt=randomBytes(16).toString('hex');const adminPasswordHash=adminSalt+':'+scryptSync(adminPassword,adminSalt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex');
 const server=createAccountServer({databasePath:':memory:',origin,secure:false,rateLimit:100,stripeWebhookSecret:webhookSecret,adminPasswordHash});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 const stripePost=(event,signatureOverride)=>{const raw=Buffer.from(JSON.stringify(event)),timestamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',webhookSecret).update(`${timestamp}.`).update(raw).digest('hex');return fetch(base+'/api/stripe-webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signatureOverride||`t=${timestamp},v1=${signature}`},body:raw})};
 try{
  const health=await fetch(base+'/health');assert.equal(health.status,200);
  assert.equal((await fetch(base+'/account.js')).status,200);assert.equal((await fetch(base+'/account.css')).status,200);
  assert.equal((await fetch(base+'/admin.html')).status,200);assert.equal((await fetch(base+'/api/admin/dashboard')).status,401);
  assert.equal((await post('/api/admin/login',{password:'wrong'})).status,401);
  const adminLogin=await post('/api/admin/login',{password:adminPassword});assert.equal(adminLogin.status,200);const adminCookie=adminLogin.headers.get('set-cookie').split(';')[0];
  const emptyDashboard=await (await fetch(base+'/api/admin/dashboard',{headers:{cookie:adminCookie}})).json();assert.equal(emptyDashboard.metrics.totalOrders,0);assert.equal(emptyDashboard.products.length,9);
  assert.equal((await fetch(base+'/api/profile')).status,401);
  const registration=await post('/api/register',{email:'Test@Example.com',password:'correct horse battery'});
  assert.equal(registration.status,201);const newAccount=await registration.json();assert.match(newAccount.recoveryCode,/^[A-Za-z0-9_-]{43}$/);
  const cookie=registration.headers.get('set-cookie').split(';')[0];
  const profile=await (await fetch(base+'/api/profile',{headers:{cookie}})).json();assert.equal(profile.profile.email,'test@example.com');assert.equal(profile.profile.address,'');
  const saved=await post('/api/profile',{fullName:'Ada Lovelace',phone:'+39 333 1234567',address:'Via Roma 1',city:'Pergine',postalCode:'38057'},cookie);
  assert.equal(saved.status,200);assert.equal((await saved.json()).profile.fullName,'Ada Lovelace');
  assert.equal((await post('/api/profile',{fullName:'<script>',phone:'',address:'',city:'',postalCode:''},cookie)).status,400);
  assert.equal((await post('/api/register',{email:'test@example.com',password:'another secure password'})).status,409);
  assert.equal((await post('/api/login',{email:'test@example.com',password:'wrong password'})).status,401);
  const recovery=await post('/api/recover',{email:'test@example.com',password:'new correct horse battery',recoveryCode:newAccount.recoveryCode});assert.equal(recovery.status,200);const recovered=await recovery.json();assert.match(recovered.recoveryCode,/^[A-Za-z0-9_-]{43}$/);
  assert.equal((await fetch(base+'/api/profile',{headers:{cookie}})).status,401);
  const login=await post('/api/login',{email:'TEST@example.com',password:'new correct horse battery'});assert.equal(login.status,200);
  const logoutCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base+'/api/orders',{headers:{cookie:logoutCookie}})).status,200);
  const event={id:'evt_test_paid_1',type:'checkout.session.completed',livemode:true,data:{object:{object:'checkout.session',id:'cs_test_order123',payment_status:'paid',amount_total:3290,currency:'eur',customer_details:{email:'test@example.com',name:'Ada Lovelace'},metadata:{item_ids:'0,1'}}}};
  const invalid=await stripePost(event,'t=1,v1=bad');assert.equal(invalid.status,400);
  const delivered=await stripePost(event);assert.equal(delivered.status,200);
  const duplicate=await stripePost(event);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).deduplicated,true);
  const orders=await (await fetch(base+'/api/orders',{headers:{cookie:logoutCookie}})).json();assert.equal(orders.orders.length,1);assert.equal(orders.orders[0].itemsSummary,'Lattafa Asad · Afnan 9PM');assert.equal(orders.orders[0].totalCents,3290);
  const liveDashboard=await (await fetch(base+'/api/admin/dashboard',{headers:{cookie:adminCookie}})).json();assert.equal(liveDashboard.metrics.totalOrders,1);assert.equal(liveDashboard.metrics.revenueCents,3290);assert.equal(liveDashboard.orders[0].email,'test@example.com');assert.equal(liveDashboard.customers.length,1);assert.equal(liveDashboard.customers.find(c=>c.email==='test@example.com').orderCount,1);
  assert.equal((await post('/api/admin/order',{id:'cs_test_order123',status:'shipped',trackingCode:'TRACK-123'},adminCookie)).status,200);
  const trackedDashboard=await (await fetch(base+'/api/admin/dashboard',{headers:{cookie:adminCookie}})).json();assert.equal(trackedDashboard.orders[0].trackingCode,'TRACK-123');assert.equal(trackedDashboard.orders[0].status,'shipped');
  const otherLogin=await post('/api/register',{email:'other@example.com',password:'another correct horse'});assert.equal(otherLogin.status,201);const otherCookie=otherLogin.headers.get('set-cookie').split(';')[0];assert.equal((await (await fetch(base+'/api/orders',{headers:{cookie:otherCookie}})).json()).orders.length,0);
  assert.equal((await post('/api/logout',{},logoutCookie)).status,200);
  assert.equal((await fetch(base+'/api/profile',{headers:{cookie:logoutCookie}})).status,401);
  console.log('Account registration, profile, sessions, validation and logout tests passed');
 }finally{await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
