const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const availabilityLabels={available:'Disponibile',unavailable:'Non disponibile',preorder:'Preordine'};
let catalogCategories=[],activeCategory='all',catalogQuery='';
const productURL=(p,miniature=false)=>`product.html?id=${encodeURIComponent(p.id)}${miniature?'&format=10ml':''}`;
const cardHTML=(p,miniature=false)=>{
 const variant=miniature?p.miniature:p;
 const image=miniature?variant.image:p.image;
 const name=p.name+(miniature?' · 10 ml':'');
 const amount=Number.isFinite(variant.price)&&variant.price>0?variant.price:miniature?LotusCommerce.offers.find(o=>o.id==='singolo').priceCents/100:null;
 const price=amount?euro(amount):'Prezzo da definire';
 const href=productURL(p,miniature);
 return `<article class="fragrance-card"><a class="fragrance-photo" href="${href}" aria-label="Scopri ${escapeHTML(name)}"><img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" loading="lazy" decoding="async" width="1000" height="1000"/></a><div class="fragrance-copy"><h4><a href="${href}">${escapeHTML(name)}</a></h4><p class="fragrance-price">${escapeHTML(price)}</p></div></article>`;
};
const categoryHTML=(category,index,entries,miniature=false)=>{
 const id=(miniature?'mini-':'')+category.id;
 const title=category.name+(miniature?' · 10 ml':'');
 return `<section class="catalog-category" id="${id}" aria-labelledby="heading-${id}"><div class="category-heading"><span>0${index+1}</span><h3 id="heading-${id}">${escapeHTML(title)}</h3><small>${entries.length} profumi</small></div><div class="fragrance-grid">${entries.map(p=>cardHTML(p,miniature)).join('')}</div></section>`;
};
const catalogHost=document.querySelector('#product-grid');
catalogHost.className='catalog-groups';
catalogHost.innerHTML='<p role="status">Caricamento della collezione…</p>';
renderProducts=function(){
 const matching=products.filter(p=>(activeCategory==='all'||p.category===activeCategory)&&`${p.name} ${p.notes.join(' ')}`.toLocaleLowerCase('it').includes(catalogQuery));
 document.querySelector('#catalog-count').textContent=`${matching.length} varianti`;
 catalogHost.innerHTML=catalogCategories.map((category,index)=>{
  const entries=matching.filter(p=>p.category===category.id);
  if(!entries.length)return '';
  return categoryHTML(category,index,entries);
 }).join('')||'<p class="catalog-empty" role="status">Nessuna fragranza corrisponde alla ricerca.</p>';
};
async function initializeCatalog(){
 try{
  const response=await fetch('products.json?v=offers1',{cache:'no-cache'});if(!response.ok)throw new Error('Catalogo non disponibile');
  const data=await response.json();catalogCategories=data.categories;products.push(...data.products);
  const controls=document.createElement('div');controls.className='catalog-controls';
  controls.innerHTML=`<div class="catalog-filter-list" role="group" aria-label="Filtra per categoria"><button data-category="all" aria-pressed="true">Tutti</button>${data.categories.map(c=>`<button data-category="${c.id}" aria-pressed="false">${escapeHTML(c.name)}</button>`).join('')}</div><div class="catalog-search-row"><label>Cerca una fragranza<input type="search" id="catalog-search" placeholder="Nome, marchio o nota olfattiva…"/></label><span id="catalog-count" role="status" aria-live="polite"></span></div>`;
  catalogHost.before(controls);
  controls.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;controls.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));renderProducts()});
  controls.querySelector('#catalog-search').oninput=e=>{catalogQuery=e.target.value.trim().toLocaleLowerCase('it');renderProducts()};
  document.querySelector('#show-all').onclick=()=>{activeCategory='all';catalogQuery='';document.querySelector('#catalog-search').value='';controls.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='all')));renderProducts()};
  document.querySelector('#show-all').innerHTML='Tutte le fragranze <span>↗</span>';
  renderProducts();
  const miniHost=document.querySelector('#miniature-grid');miniHost.className='catalog-groups';
  miniHost.innerHTML=catalogCategories.map((c,index)=>categoryHTML(c,index,products.filter(p=>p.category===c.id),true)).join('');
  document.querySelector('.collection .eyebrow').textContent=`${products.length} profumi arabi · ${catalogCategories.length} universi`;
  const hero=document.querySelector('.hero-visual');hero.classList.add('catalog-showcase');hero.removeAttribute('aria-label');
  hero.innerHTML='<div class="showcase-stage"><img id="showcase-image" width="800" height="800" alt=""/></div><div class="showcase-caption"><span>LA SELEZIONE LOTUS</span><p id="showcase-name"></p><div class="showcase-actions"><button id="showcase-previous" aria-label="Profumo precedente">←</button><span id="showcase-position"></span><button id="showcase-next" aria-label="Profumo successivo">→</button></div></div>';
  const selection=products;let current=0;
  function showSlide(){const p=selection[current];const photo=document.querySelector('#showcase-image');photo.src=p.image;photo.alt=p.name;document.querySelector('#showcase-name').textContent=p.name;document.querySelector('#showcase-position').textContent=`${String(current+1).padStart(2,'0')} / ${String(selection.length).padStart(2,'0')}`}
  document.querySelector('#showcase-previous').onclick=()=>{current=(current+selection.length-1)%selection.length;showSlide()};
  document.querySelector('#showcase-next').onclick=()=>{current=(current+1)%selection.length;showSlide()};showSlide();
  for(const [selector,id] of [['.rose-art','yara'],['.smoke-art','asad']]){const p=products.find(p=>p.id===id);const element=document.querySelector(selector);element.classList.add('catalog-feature');element.innerHTML=`<img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" width="800" height="800"/><p>${escapeHTML(p.name)}</p>`}
 }catch(error){catalogHost.innerHTML='<p role="alert">Il catalogo non è momentaneamente disponibile. Ricarica la pagina per riprovare.</p>';console.error(error)}
}
initializeCatalog();
const editCatalogLink=document.createElement('a');editCatalogLink.href='catalog-editor.html';editCatalogLink.textContent='Gestione catalogo';document.querySelector('footer a[href="admin.html"]')?.after(editCatalogLink);
