const assert=require('node:assert/strict');
const fs=require('node:fs');
const {offers,validateBundle,totalCents}=require('./commerce-core.js');
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
