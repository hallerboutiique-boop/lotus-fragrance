const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=fs.readFileSync(__dirname+'/i18n-data.js','utf8');
const engine=fs.readFileSync(__dirname+'/i18n.js','utf8');
const catalog=JSON.parse(fs.readFileSync(__dirname+'/products.json','utf8'));
for(const [index,language] of ['it','en','de','fr','es','ar'].entries()){
 const context={window:{},URLSearchParams,Intl,location:{search:'?lang='+language},localStorage:{getItem:()=>null,setItem(){}},document:{documentElement:{},addEventListener(){}}};
 vm.createContext(context);vm.runInContext(data,context);vm.runInContext(engine,context);
 const rows=context.window.LotusTranslations,api=context.window.LotusI18n;
 for(const row of rows){assert.equal(row.length,6,'Six translations: '+row[0]);assert.ok(row.every(Boolean));assert.equal(api.translate(row[0]),row[index]);assert.equal(api.translate(api.translate(row[0])),row[index],'Translation must be idempotent: '+row[0]);}
 for(const product of catalog.products){
  for(const source of [product.description,...product.notes])assert.ok(rows.some(row=>row[0]===source),'Missing product text: '+source);
  assert.equal(api.translate(product.name),product.name,'Product names must not change');
 }
 assert.equal(context.document.documentElement.lang,language);
 assert.equal(context.document.documentElement.dir,language==='ar'?'rtl':'ltr');
 assert.ok(api.money(14.9).includes('€'));
 if(language!=='it')for(const source of ['3 flaconi · 10 ml ciascuno','Fragranza 1','Scegli tutte le 3 fragranze.','9 profumi arabi · 2 universi','Totale · spedizione inclusa'])assert.notEqual(api.translate(source),source);
 assert.equal(api.translate('Lattafa · Profumi arabi da uomo'),language==='it'?'Lattafa · Profumi arabi da uomo':'Lattafa · '+api.translate('Profumi arabi da uomo'));
}
for(const file of ['index.html','product.html','admin.html','catalog-editor.html']){
 const html=fs.readFileSync(__dirname+'/'+file,'utf8');assert.ok(html.includes('src="i18n-data.js?v=1"'));assert.ok(html.includes('src="i18n.js?v=1"'));assert.ok(html.includes('href="i18n.css?v=1"'));
}
console.log('i18n: six complete dictionaries, nine product descriptions/notes, dynamic messages, RTL, EUR and page integration passed.');
