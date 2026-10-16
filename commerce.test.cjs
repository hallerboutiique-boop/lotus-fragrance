const assert=require('node:assert/strict');
const fs=require('node:fs');
const {offers,validateBundle,validateLine,totalCents,quote,resolveMystery}=require('./commerce-core.js');
const catalog=JSON.parse(fs.readFileSync('products.json')).products;
assert.deepEqual(offers.map(o=>[o.count,o.priceCents]),[[1,1490],[3,3290],[5,4990]]);
for(const offer of offers){
 const ids=Array(offer.count).fill('asad');
 assert.equal(validateBundle(offer.id,ids,catalog).ok,true,'Ripetizioni consentite');
 assert.equal(validateBundle(offer.id,ids.slice(1),catalog).ok,false,'Selezioni incomplete bloccate');
 assert.equal(validateBundle(offer.id,[...ids,'yara'],catalog).ok,false,'Selezioni in eccesso bloccate');
 assert.equal(validateBundle(offer.id,ids.map((id,i)=>i?'asad':''),catalog).ok,false);
 assert.equal(totalCents([{offerId:offer.id,fragranceIds:ids,priceCents:1}],catalog),offer.priceCents,'Prezzo ricostruito, non letto dal carrello');
}
assert.equal(validateBundle('tris',['asad','yara','9pm'],catalog).ok,true);
assert.equal(validateBundle('box',['asad','yara','9pm','eclaire','prive-rose'],catalog).ok,true);
assert.equal(validateBundle('singolo',['nebras'],catalog).ok,false);
assert.equal(validateBundle('fake',['asad'],catalog).ok,false);
assert.equal(validateBundle('tris','asad',catalog).ok,false);
for(const availability of [null,'unavailable','preorder']){
 const changed=catalog.map(p=>p.id==='asad'?{...p,miniature:{...p.miniature,availability}}:p);
 assert.equal(validateBundle('singolo',['asad'],changed).ok,false);
}
assert.equal(totalCents(offers.map(o=>({offerId:o.id,fragranceIds:Array(o.count).fill('asad')})),catalog),9770);
assert.throws(()=>totalCents([{offerId:'tris',fragranceIds:['asad']}],catalog));
console.log('Offerte, totali, ripetizioni, selezioni e disponibilità: test superati.');
for(let count=0;count<=12;count++){
 const lines=Array.from({length:count},()=>({offerId:'singolo',fragranceIds:['asad'],priceCents:1}));
 assert.equal(totalCents(lines,catalog),Math.floor(count/3)*3290+(count%3)*1490);
 assert.equal(quote(lines,catalog).savingsCents,Math.floor(count/3)*1180);
}
assert.equal(totalCents([{offerId:'singolo',fragranceIds:['asad']},{offerId:'singolo',fragranceIds:['yara']},{offerId:'singolo',fragranceIds:['9pm']}],catalog),3290);
for(const gender of ['men','women','mix']){
 const line={offerId:'mystery',gender,fragranceIds:['fake'],priceCents:1};
 assert.equal(validateLine(line,catalog).ok,true);
 assert.deepEqual(validateLine(line,catalog).line,{offerId:'mystery',gender});
 assert.equal(totalCents([line],catalog),4990);
 for(let i=0;i<30;i++){
  const ids=resolveMystery(gender,catalog,max=>Math.floor(Math.random()*max));
  assert.equal(ids.length,5);
  assert.ok(ids.every(id=>catalog.some(p=>p.id===id&&p.miniature.availability==='available')));
  const categories=ids.map(id=>catalog.find(p=>p.id===id).category);
  if(gender==='mix'){assert.ok(categories.includes('arabi-uomo'));assert.ok(categories.includes('arabi-donna'));assert.equal(new Set(ids).size,5)}
  else assert.ok(categories.every(c=>c===(gender==='men'?'arabi-uomo':'arabi-donna')));
  if(gender==='women')assert.equal(new Set(ids).size,4);
 }
}
assert.equal(validateLine({offerId:'mystery',gender:'invalid'},catalog).ok,false);
assert.equal(validateLine({offerId:'mystery',gender:'women'},catalog.filter(p=>p.category!=='arabi-donna')).ok,false);
assert.equal(validateLine({offerId:'mystery',gender:'mix'},catalog.filter(p=>p.category!=='arabi-donna')).ok,false);
assert.throws(()=>resolveMystery('men',catalog));
assert.throws(()=>resolveMystery('men',catalog,()=>100));
assert.equal(totalCents([{offerId:'mystery',gender:'women'},...Array.from({length:3},()=>({offerId:'singolo',fragranceIds:['asad']}))],catalog),8280);
console.log('Tris automatico, rimozioni, gruppi multipli, Mystery Box e preferenze uomo/donna/mix: test superati.');
