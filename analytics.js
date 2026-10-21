'use strict';
(function(){
 const key='lotus-analytics-session';let volatileSession='';
 const getSession=()=>{try{let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID().replaceAll('-','');sessionStorage.setItem(key,id)}return id}catch{if(!volatileSession)volatileSession=crypto.randomUUID().replaceAll('-','');return volatileSession}};
 function event(name){if(localStorage.getItem('lotus-analytics-consent')!=='yes')return;const path=location.pathname+(location.hash||'');fetch('https://lotus-fragrance-accounts.fly.dev/api/analytics/event',{method:'POST',mode:'cors',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({session:getSession(),event:name,path,referrer:document.referrer||''})}).catch(()=>{})}
 const start=()=>{if(localStorage.getItem('lotus-analytics-consent')==='yes')event('page_view')};
 window.LotusAnalytics={event,start};start();
})();
