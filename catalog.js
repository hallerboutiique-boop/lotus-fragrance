const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const availabilityLabels={available:'Disponibile',unavailable:'Non disponibile',preorder:'Preordine'};
let catalogCategories=[],activeCategory='all',catalogQuery='';
const fragranceObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-in-view',entry.isIntersecting)),{rootMargin:'100px'});
const purchasable=p=>Number.isFinite(p.price)&&p.price>0&&p.size&&p.availability==='available';
const commercialInfo=p=>[Number.isFinite(p.price)&&p.price>0?euro(p.price):null,p.size,availabilityLabels[p.availability]].filter(Boolean).map(escapeHTML).join(' · ');
const catalogHost=document.querySelector('#product-grid');
catalogHost.className='catalog-groups';
catalogHost.innerHTML='<p role="status">Caricamento della collezione…</p>';
renderProducts=function(){
 fragranceObserver.disconnect();
 const matching=products.filter(p=>(activeCategory==='all'||p.category===activeCategory)&&`${p.name} ${p.notes.join(' ')}`.toLocaleLowerCase('it').includes(catalogQuery));
 document.querySelector('#catalog-count').textContent=`${matching.length} varianti`;
 catalogHost.innerHTML=catalogCategories.map((category,index)=>{
  const entries=matching.filter(p=>p.category===category.id);
  if(!entries.length)return '';
  return `<section class="catalog-category" id="${category.id}" aria-labelledby="heading-${category.id}"><div class="category-heading"><span>0${index+1}</span><h3 id="heading-${category.id}">${escapeHTML(category.name)}</h3><small>${entries.length} varianti</small></div><div class="fragrance-grid">${entries.map(p=>`<article class="fragrance-card"><button class="fragrance-photo" data-product="${p.id}" aria-label="Scopri ${escapeHTML(p.name)}"><img src="${escapeHTML(p.image)}" alt="Flacone ${escapeHTML(p.name)}" loading="lazy" decoding="async" width="800" height="800"/><span>Scopri ↗</span></button><div class="fragrance-copy"><p class="fragrance-brand">${escapeHTML(p.brand)}</p><h4>${escapeHTML(p.name)}</h4><p class="fragrance-description">${escapeHTML(p.description)}</p><ul class="fragrance-notes" aria-label="Note olfattive">${p.notes.map(n=>`<li>${escapeHTML(n)}</li>`).join('')}</ul>${commercialInfo(p)?`<p class="fragrance-commercial">${commercialInfo(p)}</p>`:''}<button class="fragrance-details" data-product="${p.id}">Scopri la fragranza <span>↗</span></button></div></article>`).join('')}</div></section>`;
 }).join('')||'<p class="catalog-empty" role="status">Nessuna fragranza corrisponde alla ricerca.</p>';
 catalogHost.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>showFragrance(b.dataset.product)));
 catalogHost.querySelectorAll('.fragrance-card').forEach(card=>fragranceObserver.observe(card));
};
const productDialog=document.createElement('dialog');
productDialog.className='fragrance-dialog';productDialog.id='fragrance-dialog';
document.body.append(productDialog);
function showFragrance(id){
 const p=products.find(p=>p.id===id);if(!p)return;
 productDialog.innerHTML=`<button class="modal-close" aria-label="Chiudi scheda prodotto">×</button><div class="fragrance-detail-layout"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" width="800" height="800"/><div><p class="fragrance-brand">${escapeHTML(p.brand)}</p><h2>${escapeHTML(p.name)}</h2><p>${escapeHTML(p.description)}</p><ul class="fragrance-notes">${p.notes.map(n=>`<li>${escapeHTML(n)}</li>`).join('')}</ul>${commercialInfo(p)?`<p>${commercialInfo(p)}</p>`:'<p class="product-pending">Prezzo, formato e disponibilità da confermare.</p>'}${purchasable(p)?'<button class="button dark" id="product-add">Aggiungi al carrello</button>':''}<a class="source-link" href="${escapeHTML(p.source)}" target="_blank" rel="noopener noreferrer">Scheda della fragranza · fonte ↗</a></div></div>`;
 productDialog.querySelector('.modal-close').onclick=()=>productDialog.close();
 productDialog.querySelector('#product-add')?.addEventListener('click',()=>{productDialog.close();add(p.id)});
 productDialog.showModal();
}
productDialog.addEventListener('click',e=>{if(e.target===productDialog){const r=productDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)productDialog.close()}});
async function initializeCatalog(){
 try{
  const response=await fetch('products.json?v=arabi-studio2',{cache:'no-cache'});if(!response.ok)throw new Error('Catalogo non disponibile');
  const data=await response.json();catalogCategories=data.categories;products.push(...data.products);
  const controls=document.createElement('div');controls.className='catalog-controls';
  controls.innerHTML=`<div class="catalog-filter-list" role="group" aria-label="Filtra per categoria"><button data-category="all" aria-pressed="true">Tutti</button>${data.categories.map(c=>`<button data-category="${c.id}" aria-pressed="false">${escapeHTML(c.name)}</button>`).join('')}</div><div class="catalog-search-row"><label>Cerca una fragranza<input type="search" id="catalog-search" placeholder="Nome, marchio o nota olfattiva…"/></label><span id="catalog-count" role="status" aria-live="polite"></span><button id="motion-toggle" aria-pressed="false">Pausa movimento Ⅱ</button></div>`;
  catalogHost.before(controls);
  controls.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;controls.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));renderProducts()});
  controls.querySelector('#catalog-search').oninput=e=>{catalogQuery=e.target.value.trim().toLocaleLowerCase('it');renderProducts()};
  document.querySelector('#show-all').onclick=()=>{activeCategory='all';catalogQuery='';document.querySelector('#catalog-search').value='';controls.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='all')));renderProducts()};
  document.querySelector('#show-all').innerHTML='Tutte le fragranze <span>↗</span>';
  let motionPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function syncMotion(){document.body.classList.toggle('catalog-motion-paused',motionPaused);const b=document.querySelector('#motion-toggle');b.textContent=motionPaused?'Attiva movimento ↻':'Pausa movimento Ⅱ';b.setAttribute('aria-pressed',String(motionPaused))}
  document.querySelector('#motion-toggle').onclick=()=>{motionPaused=!motionPaused;syncMotion()};syncMotion();
  renderProducts();
  document.querySelector('.collection .eyebrow').textContent='10 profumi arabi · 2 universi';
  const hero=document.querySelector('.hero-visual');hero.classList.add('catalog-showcase');hero.removeAttribute('aria-label');
  hero.innerHTML='<div class="showcase-stage"><img id="showcase-image" width="800" height="800" alt=""/></div><div class="showcase-caption"><span>LA SELEZIONE LOTUS</span><p id="showcase-name"></p><div class="showcase-actions"><button id="showcase-previous" aria-label="Profumo precedente">←</button><span id="showcase-position"></span><button id="showcase-next" aria-label="Profumo successivo">→</button></div></div>';
  const selection=products;let current=0;
  function showSlide(){const p=selection[current];const photo=document.querySelector('#showcase-image');photo.src=p.image;photo.alt=p.name;document.querySelector('#showcase-name').textContent=p.name;document.querySelector('#showcase-position').textContent=`${String(current+1).padStart(2,'0')} / ${String(selection.length).padStart(2,'0')}`}
  document.querySelector('#showcase-previous').onclick=()=>{current=(current+selection.length-1)%selection.length;showSlide()};
  document.querySelector('#showcase-next').onclick=()=>{current=(current+1)%selection.length;showSlide()};showSlide();
  setInterval(()=>{if(!motionPaused&&!document.hidden&&!hero.matches(':hover')&&!hero.matches(':focus-within')){current=(current+1)%selection.length;showSlide()}},6500);
  for(const [selector,id] of [['.rose-art','yara'],['.smoke-art','asad']]){const p=products.find(p=>p.id===id);const element=document.querySelector(selector);element.classList.add('catalog-feature');element.innerHTML=`<img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" width="800" height="800"/><p>${escapeHTML(p.name)}</p>`}
 }catch(error){catalogHost.innerHTML='<p role="alert">Il catalogo non è momentaneamente disponibile. Ricarica la pagina per riprovare.</p>';console.error(error)}
}
initializeCatalog();
const editCatalogLink=document.createElement('a');editCatalogLink.href='catalog-editor.html';editCatalogLink.textContent='Gestione catalogo';document.querySelector('footer a[href="admin.html"]')?.after(editCatalogLink);
