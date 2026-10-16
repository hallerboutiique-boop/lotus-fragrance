(function(root){
 'use strict';
 const offers=Object.freeze([
  Object.freeze({id:'singolo',name:'Singolo',count:1,priceCents:1490}),
  Object.freeze({id:'tris',name:'Tris',count:3,priceCents:3290,recommended:true}),
  Object.freeze({id:'box',name:'Mystery Box',count:5,priceCents:4990})
 ]);
 function validateBundle(offerId,fragranceIds,catalog){
  const offer=offers.find(o=>o.id===offerId);
  if(!offer||!Array.isArray(fragranceIds)||fragranceIds.length!==offer.count||fragranceIds.some(id=>typeof id!=='string'||!id))return {ok:false,error:'Scegli la fragranza di ogni flacone.'};
  const selected=fragranceIds.map(id=>catalog.find(p=>p.id===id));
  if(selected.some(p=>!p||p.miniature?.availability!=='available'))return {ok:false,error:'Una fragranza selezionata non è disponibile in formato 10 ml. Modifica la selezione.'};
  return {ok:true,line:{offerId:offer.id,fragranceIds:[...fragranceIds]},offer,selected};
 }
 const genders=Object.freeze({men:'arabi-uomo',women:'arabi-donna',mix:null});
 function mysteryPool(gender,catalog){return Object.hasOwn(genders,gender)?catalog.filter(p=>p.miniature?.availability==='available'&&(!genders[gender]||p.category===genders[gender])):[]}
 function validateLine(line,catalog){
  if(line?.offerId==='mystery'){
   const pool=mysteryPool(line.gender,catalog);
   if(!pool.length||(line.gender==='mix'&&!['arabi-uomo','arabi-donna'].every(c=>pool.some(p=>p.category===c))))return {ok:false,error:'Selezione Mystery Box non disponibile.'};
   return {ok:true,line:{offerId:'mystery',gender:line.gender},offer:offers[2],selected:[]};
  }
  return validateBundle(line?.offerId,line?.fragranceIds,catalog);
 }
 function quote(cart,catalog){
  let baseCents=0,regularCount=0;
  for(const line of cart){const result=validateLine(line,catalog);if(!result.ok)throw Error(result.error);if(['singolo','tris'].includes(result.offer.id)&&line.offerId!=='mystery'){regularCount+=result.selected.length;baseCents+=result.selected.length*1490}else baseCents+=result.offer.priceCents;}
  const trisCount=Math.floor(regularCount/3),savingsCents=trisCount*(3*1490-3290),totalCents=baseCents-savingsCents;
  if(!Number.isSafeInteger(totalCents))throw Error('Totale non valido');
  return {baseCents,totalCents,savingsCents,trisCount,regularCount};
 }
 const totalCents=(cart,catalog)=>quote(cart,catalog).totalCents;
 // Call only on the checkout server and persist the draw with the order.
 function resolveMystery(gender,catalog,random){
  if(typeof random!=='function')throw Error('Secure server random source required');
  const result=validateLine({offerId:'mystery',gender},catalog);if(!result.ok)throw Error(result.error);
  const pool=mysteryPool(gender,catalog),chosen=[],remaining=[...pool];
  function take(candidates){const n=random(candidates.length);if(!Number.isInteger(n)||n<0||n>=candidates.length)throw Error('Invalid random source');const item=candidates[n];chosen.push(item.id);const index=remaining.findIndex(p=>p.id===item.id);if(index>=0)remaining.splice(index,1)}
  if(gender==='mix'){take(remaining.filter(p=>p.category==='arabi-uomo'));take(remaining.filter(p=>p.category==='arabi-donna'))}
  while(chosen.length<5)take(remaining.length?remaining:pool);
  return chosen;
 }
 const api=Object.freeze({offers,validateBundle,validateLine,totalCents,quote,resolveMystery});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LotusCommerce=api;
})(typeof window!=='undefined'?window:globalThis);
