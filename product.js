const escapeProduct=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const productMoney={format:value=>LotusI18n.money(value)};
async function loadProduct(){
 const host=document.querySelector('#product-content');
 try{
  const response=await fetch('products.json?v=offers1',{cache:'no-cache'});if(!response.ok)throw Error();
  const data=await response.json(),params=new URLSearchParams(location.search);
  const product=data.products.find(p=>p.id===params.get('id'));
  if(!product){document.title='Fragranza non trovata · Lotus Fragrance';host.innerHTML='<h1>Fragranza non trovata</h1><a class="back-link" href="index.html#collezione">← Torna al catalogo</a>';return;}
  const mini=params.get('format')==='10ml',variant=mini?product.miniature:product;
  const title=product.name+(mini?' · 10 ml':'');
  const category=data.categories.find(c=>c.id===product.category);
  const back=product.category;
  const href='product.html?id='+encodeURIComponent(product.id);
  const amount=Number.isFinite(variant.price)&&variant.price>0?variant.price:mini?LotusCommerce.offers.find(o=>o.id==='singolo').priceCents/100:null;
  const price=amount?productMoney.format(amount)+(mini?' · Spedizione inclusa':''):'Prezzo da definire';
  const status={available:'Disponibile',unavailable:'Non disponibile',preorder:'Preordine'}[variant.availability]||'Disponibilità da confermare';
  document.title=title+' · Lotus Fragrance';
  host.innerHTML=`<a class="back-link" href="index.html#${back}">← Torna alla collezione</a><div class="product-layout"><figure class="product-photo"><img src="${escapeProduct(variant.image)}" alt="${escapeProduct(title)}" width="1000" height="1000"/><figcaption>${mini?'Miniatura 10 ml: ricostruzione illustrativa, non confezione ufficiale verificata.':'Immagine rielaborata con luce da studio. La miniatura affiancata è una ricostruzione illustrativa, non una confezione ufficiale verificata.'}</figcaption></figure><section aria-labelledby="product-title"><p class="product-brand">${escapeProduct(product.brand)} · ${escapeProduct(category?.name)}</p><h1 id="product-title">${escapeProduct(title)}</h1><p class="product-price">${escapeProduct(price)}</p><nav class="format-links" aria-label="Scegli formato"><a href="${href}" ${!mini?'aria-current="page"':''}>Confezione normale</a><a href="${href}&format=10ml" ${mini?'aria-current="page"':''}>Formato tascabile · 10 ml</a></nav><p class="format-links"><a href="index.html#offerte">Scegli Singolo, Tris o Discovery Box · 10 ml</a></p><h2>La fragranza</h2><p class="product-description">${escapeProduct(product.description)}</p><h2>Note olfattive</h2><ul class="product-notes">${product.notes.map(n=>`<li>${escapeProduct(n)}</li>`).join('')}</ul><p class="product-status">${escapeProduct(variant.size||'Formato da confermare')} · ${escapeProduct(status)}</p><a class="source-link" href="${escapeProduct(product.source)}" target="_blank" rel="noopener noreferrer">Scheda della fragranza · fonte ↗</a></section></div>`;
 }catch{host.innerHTML='<p role="alert">Impossibile caricare la fragranza. Ricarica la pagina per riprovare.</p><a href="index.html#collezione">Torna al catalogo</a>';}
}
loadProduct();
