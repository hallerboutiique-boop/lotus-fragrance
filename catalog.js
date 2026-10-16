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
 const matching=LotusSearch.search(products,catalogQuery,LotusI18n.translate).filter(p=>activeCategory==='all'||p.category===activeCategory);
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
  const searchRow=controls.querySelector('.catalog-search-row');searchRow.classList.add('smart-search');
  document.querySelector('.topbar').after(searchRow);
  const searchInput=searchRow.querySelector('input');searchInput.maxLength=120;searchInput.autocomplete='off';
  searchInput.setAttribute('role','combobox');searchInput.setAttribute('aria-autocomplete','list');searchInput.setAttribute('aria-controls','search-suggestions');searchInput.setAttribute('aria-expanded','false');
  const suggestions=document.createElement('ul');suggestions.id='search-suggestions';suggestions.className='search-suggestions';suggestions.setAttribute('role','listbox');suggestions.setAttribute('aria-label','Suggerimenti di ricerca');suggestions.hidden=true;searchRow.append(suggestions);
  let selectedSuggestion=-1;
  function hideSuggestions(){suggestions.hidden=true;searchInput.setAttribute('aria-expanded','false');searchInput.removeAttribute('aria-activedescendant');selectedSuggestion=-1}
  function suggest(){
   selectedSuggestion=-1;searchInput.removeAttribute('aria-activedescendant');
   const matches=LotusSearch.search(products,searchInput.value,LotusI18n.translate).slice(0,6);
   if(!searchInput.value.trim()){hideSuggestions();return}
   suggestions.innerHTML=matches.length?matches.map((p,i)=>`<li role="presentation"><a role="option" aria-selected="false" id="search-option-${i}" href="${productURL(p)}"><img src="${escapeHTML(p.image)}" alt="" width="64" height="64"/><span><strong>${escapeHTML(p.name)}</strong><small>${p.notes.map(note=>escapeHTML(LotusI18n.translate(note))).join(' · ')}</small></span><span aria-hidden="true">↗</span></a></li>`).join(''):'<li role="presentation" class="search-no-results">Nessuna fragranza corrisponde alla ricerca.</li>';
   suggestions.hidden=false;searchInput.setAttribute('aria-expanded','true');
  }
  searchInput.oninput=e=>{catalogQuery=e.target.value.trim();renderProducts();suggest()};
  searchInput.addEventListener('focus',suggest);
  searchInput.addEventListener('keydown',event=>{
   const options=[...suggestions.querySelectorAll('a')];
   if(event.key==='Escape'){hideSuggestions();return}
   if(['ArrowDown','ArrowUp'].includes(event.key)&&options.length){event.preventDefault();suggestions.hidden=false;searchInput.setAttribute('aria-expanded','true');selectedSuggestion=(selectedSuggestion+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===selectedSuggestion)));searchInput.setAttribute('aria-activedescendant',options[selectedSuggestion].id);options[selectedSuggestion].scrollIntoView({block:'nearest'})}
   if(event.key==='Enter'){event.preventDefault();if(selectedSuggestion>=0&&options[selectedSuggestion])location.assign(options[selectedSuggestion].href);else{hideSuggestions();document.querySelector('#collezione').scrollIntoView({behavior:'smooth'})}}
  });
  document.addEventListener('pointerdown',event=>{if(!searchRow.contains(event.target))hideSuggestions()});
  searchRow.addEventListener('focusout',event=>{if(!searchRow.contains(event.relatedTarget))hideSuggestions()});
  document.querySelector('#show-all').onclick=()=>{activeCategory='all';catalogQuery='';document.querySelector('#catalog-search').value='';hideSuggestions();controls.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='all')));renderProducts()};
  document.querySelector('#show-all').innerHTML='Tutte le fragranze <span>↗</span>';
  renderProducts();
  document.querySelector('.collection .eyebrow').textContent=`${products.length} profumi arabi · ${catalogCategories.length} universi`;
  const hero=document.querySelector('.hero-visual');hero.classList.add('catalog-showcase');hero.removeAttribute('aria-label');
  hero.innerHTML='<div class="showcase-stage"><img id="showcase-image" width="800" height="800" alt=""/></div><div class="showcase-caption"><span>LA SELEZIONE LOTUS</span><p id="showcase-name"></p><div class="showcase-actions"><button id="showcase-previous" aria-label="Profumo precedente">←</button><span id="showcase-position"></span><button id="showcase-next" aria-label="Profumo successivo">→</button></div></div>';
  const selection=products;let current=0,slideTimer;
  function showSlide(){const p=selection[current];const photo=document.querySelector('#showcase-image');photo.src=p.image;photo.alt=p.name;document.querySelector('#showcase-name').textContent=p.name;document.querySelector('#showcase-position').textContent=`${String(current+1).padStart(2,'0')} / ${String(selection.length).padStart(2,'0')}`}
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function stopSlides(){clearInterval(slideTimer)}
  function startSlides(){stopSlides();if(!document.hidden&&!reducedMotion.matches)slideTimer=setInterval(()=>{current=(current+1)%selection.length;showSlide()},2000)}
  document.querySelector('#showcase-previous').onclick=()=>{current=(current+selection.length-1)%selection.length;showSlide();startSlides()};
  document.querySelector('#showcase-next').onclick=()=>{current=(current+1)%selection.length;showSlide();startSlides()};showSlide();startSlides();
  hero.addEventListener('mouseenter',stopSlides);hero.addEventListener('mouseleave',startSlides);
  hero.addEventListener('focusin',stopSlides);hero.addEventListener('focusout',event=>{if(!hero.contains(event.relatedTarget))startSlides()});
  document.addEventListener('visibilitychange',()=>document.hidden?stopSlides():startSlides());
  reducedMotion.addEventListener('change',startSlides);
  for(const [selector,id] of [['.rose-art','yara'],['.smoke-art','asad']]){const p=products.find(p=>p.id===id);const element=document.querySelector(selector);element.classList.add('catalog-feature');element.innerHTML=`<img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" width="800" height="800"/><p>${escapeHTML(p.name)}</p>`}
 }catch(error){catalogHost.innerHTML='<p role="alert">Il catalogo non è momentaneamente disponibile. Ricarica la pagina per riprovare.</p>';console.error(error)}
}
initializeCatalog();
const editCatalogLink=document.createElement('a');editCatalogLink.href='catalog-editor.html';editCatalogLink.textContent='Gestione catalogo';document.querySelector('footer a[href="admin.html"]')?.after(editCatalogLink);
