'use strict';
const assert=require('node:assert/strict');
const {createAccountServer}=require('./account-server.cjs');

async function main(){
 const origin='http://127.0.0.1';
 const server=createAccountServer({databasePath:':memory:',origin,secure:false,rateLimit:100});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 try{
  const health=await fetch(base+'/health');assert.equal(health.status,200);
  assert.equal((await fetch(base+'/account.js')).status,200);assert.equal((await fetch(base+'/account.css')).status,200);
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
  const logoutCookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await post('/api/logout',{},logoutCookie)).status,200);
  assert.equal((await fetch(base+'/api/profile',{headers:{cookie:logoutCookie}})).status,401);
  console.log('Account registration, profile, sessions, validation and logout tests passed');
 }finally{await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
