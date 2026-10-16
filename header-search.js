/* The same inline product search is available outside the home catalogue. */
(async()=>{
 if(document.querySelector('.topbar'))return;
 let header=document.querySelector('.product-header');
 if(!header){header=document.createElement('header');header.className='product-header';header.innerHTML='<a href="index.html" aria-label="Lotus Fragrance"><img src="assets/lotus-logo-new.jpg" alt="Lotus Fragrance" width="140" height="140"/></a><nav><a href="index.html">Lotus Fragrance</a></nav>';document.body.prepend(header)}
 header.querySelector('a').classList.add('brand-logo');
 const actions=document.createElement('div');actions.className='header-actions';header.append(actions);
 const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const productURL=p=>'product.html?id='+encodeURIComponent(p.id)+'&lang='+LotusI18n.language;
 let products=[];
   const searchRow=document.createElement('div');searchRow.className='catalog-search-row smart-search';searchRow.innerHTML='<label>Cerca una fragranza<input type="search" id="catalog-search"/></label>';
  const topbar=header;searchRow.id='header-search-panel';searchRow.hidden=true;topbar.append(searchRow);
  const searchToggle=document.createElement('button');searchToggle.type='button';searchToggle.id='search-toggle';searchToggle.className='search-toggle';searchToggle.setAttribute('aria-label','Cerca una fragranza');searchToggle.setAttribute('aria-expanded','false');searchToggle.setAttribute('aria-controls',searchRow.id);
  searchToggle.innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  topbar.querySelector('.header-actions').prepend(searchToggle);
  const accountLink=document.createElement('a');accountLink.className='account-link';accountLink.href='account.html';accountLink.setAttribute('aria-label','Area clienti');accountLink.title='Area clienti';
  accountLink.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.4-3.7 3.2-5.7 7-5.7s6.6 2 7 5.7"/></svg>';
  searchToggle.after(accountLink);
  const searchClose=document.createElement('button');searchClose.type='button';searchClose.className='search-close';searchClose.setAttribute('aria-label','Chiudi');searchClose.textContent='×';searchRow.append(searchClose);
  const searchInput=searchRow.querySelector('input');searchInput.maxLength=120;searchInput.autocomplete='off';searchInput.placeholder={it:'Cerca…',en:'Search…',de:'Suchen…',fr:'Chercher…',es:'Buscar…',ar:'بحث…'}[LotusI18n.language];
  searchInput.setAttribute('role','combobox');searchInput.setAttribute('aria-autocomplete','list');searchInput.setAttribute('aria-controls','search-suggestions');searchInput.setAttribute('aria-expanded','false');
  const suggestions=document.createElement('ul');suggestions.id='search-suggestions';suggestions.className='search-suggestions';suggestions.setAttribute('role','listbox');suggestions.setAttribute('aria-label','Suggerimenti di ricerca');suggestions.hidden=true;searchRow.append(suggestions);
  let selectedSuggestion=-1;
  function hideSuggestions(){suggestions.hidden=true;searchInput.setAttribute('aria-expanded','false');searchInput.removeAttribute('aria-activedescendant');selectedSuggestion=-1}
  function closeSearch(restoreFocus=false){hideSuggestions();searchRow.hidden=true;topbar.classList.remove('search-open');searchToggle.setAttribute('aria-expanded','false');if(restoreFocus)searchToggle.focus()}
  searchToggle.onclick=()=>{if(!searchRow.hidden){closeSearch();return}searchRow.hidden=false;topbar.classList.add('search-open');searchToggle.setAttribute('aria-expanded','true');searchInput.focus()};
  searchClose.onclick=()=>closeSearch(true);
  function suggest(){
   selectedSuggestion=-1;searchInput.removeAttribute('aria-activedescendant');
   const matches=LotusSearch.search(products,searchInput.value,LotusI18n.translate).slice(0,6);
   if(!searchInput.value.trim()){hideSuggestions();return}
   suggestions.innerHTML=matches.length?matches.map((p,i)=>`<li role="presentation"><a role="option" aria-selected="false" id="search-option-${i}" href="${productURL(p)}"><img src="${escapeHTML(p.image)}" alt="" width="64" height="64"/><span><strong>${escapeHTML(p.name)}</strong><small>${p.notes.map(note=>escapeHTML(LotusI18n.translate(note))).join(' · ')}</small></span><span aria-hidden="true">↗</span></a></li>`).join(''):'<li role="presentation" class="search-no-results">Nessuna fragranza corrisponde alla ricerca.</li>';
   suggestions.hidden=false;searchInput.setAttribute('aria-expanded','true');
  }
  searchInput.oninput=suggest;
  searchInput.addEventListener('focus',suggest);
  searchInput.addEventListener('keydown',event=>{
   const options=[...suggestions.querySelectorAll('a')];
   if(event.key==='Escape'){closeSearch(true);return}
   if(['ArrowDown','ArrowUp'].includes(event.key)&&options.length){event.preventDefault();suggestions.hidden=false;searchInput.setAttribute('aria-expanded','true');selectedSuggestion=(selectedSuggestion+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===selectedSuggestion)));searchInput.setAttribute('aria-activedescendant',options[selectedSuggestion].id);options[selectedSuggestion].scrollIntoView({block:'nearest'})}
   if(event.key==='Enter'){event.preventDefault();if(selectedSuggestion>=0&&options[selectedSuggestion])location.assign(options[selectedSuggestion].href);else if(options[0])location.assign(options[0].href)}
  });
  document.addEventListener('pointerdown',event=>{if(!searchRow.contains(event.target)&&!searchToggle.contains(event.target))closeSearch()});
  searchRow.addEventListener('focusout',event=>{if(!searchRow.contains(event.relatedTarget))hideSuggestions()});

 try{const response=await fetch('products.json',{cache:'no-cache'});if(!response.ok)throw Error();products=(await response.json()).products;if(!searchRow.hidden&&searchInput.value)suggest()}
 catch{searchInput.disabled=true;searchInput.placeholder=LotusI18n.translate('Il catalogo non è momentaneamente disponibile. Ricarica la pagina per riprovare.')}
})();
