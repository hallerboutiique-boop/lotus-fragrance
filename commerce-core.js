(function(root){
 'use strict';
 const offers=Object.freeze([
  Object.freeze({id:'singolo',name:'Singolo',count:1,priceCents:1490}),
  Object.freeze({id:'tris',name:'Tris Discovery',count:3,priceCents:3290,recommended:true}),
  Object.freeze({id:'box',name:'Discovery Box',count:5,priceCents:4990})
 ]);
 function validateBundle(offerId,fragranceIds,catalog){
  const offer=offers.find(o=>o.id===offerId);
  if(!offer||!Array.isArray(fragranceIds)||fragranceIds.length!==offer.count||fragranceIds.some(id=>typeof id!=='string'||!id))return {ok:false,error:'Scegli la fragranza di ogni flacone.'};
  const selected=fragranceIds.map(id=>catalog.find(p=>p.id===id));
  if(selected.some(p=>!p||p.miniature?.availability!=='available'))return {ok:false,error:'Una fragranza selezionata non è disponibile in formato 10 ml. Modifica la selezione.'};
  return {ok:true,line:{offerId:offer.id,fragranceIds:[...fragranceIds]},offer,selected};
 }
 function totalCents(cart,catalog){
  let total=0;
  for(const line of cart){const result=validateBundle(line.offerId,line.fragranceIds,catalog);if(!result.ok)throw Error(result.error);total+=result.offer.priceCents;}
  if(!Number.isSafeInteger(total))throw Error('Totale non valido');
  return total;
 }
 const api=Object.freeze({offers,validateBundle,totalCents});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LotusCommerce=api;
})(typeof window!=='undefined'?window:globalThis);
