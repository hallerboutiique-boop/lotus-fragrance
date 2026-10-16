async function initializeOffers(){
 const host=document.querySelector('#offer-grid');
 try{
  const responses=await Promise.all([fetch('products.json?v=offers1',{cache:'no-cache'}),fetch('commerce-config.json',{cache:'no-cache'})]);
  if(responses.some(r=>!r.ok))throw Error();
  const [data,config]=await Promise.all(responses.map(r=>r.json()));
  initializeCommerce(data.products,config);
  const escapeOffer=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=data.categories.map(category=>{
   const items=data.products.filter(p=>p.category===category.id&&p.miniature?.availability==='available');
   return items.length?`<optgroup label="${escapeOffer(category.name)}">${items.map(p=>`<option value="${escapeOffer(p.id)}">${escapeOffer(p.name)}</option>`).join('')}</optgroup>`:'';
  }).join('');
  host.innerHTML=LotusCommerce.offers.map(offer=>`<form class="offer-card ${offer.recommended?'offer-recommended':''}" data-offer="${offer.id}">${offer.recommended?'<p class="offer-badge">Più scelto</p>':''}<p class="offer-kicker">${offer.count} ${offer.count===1?'flacone':'flaconi'} · 10 ml ciascuno</p><h3>${offer.name}</h3><p class="offer-price">${euro(offer.priceCents/100)}</p><p class="offer-shipping">Spedizione inclusa</p><p class="offer-instruction">${offer.recommended?'Offerta consigliata. ':''}Scegli liberamente ${offer.count===1?'la tua fragranza':'le fragranze, anche diverse tra loro'}.</p><div class="offer-selectors">${Array.from({length:offer.count},(_,i)=>`<label for="${offer.id}-${i}">Fragranza ${i+1}<select id="${offer.id}-${i}" name="fragrance-${i+1}" required><option value="">Scegli una fragranza</option>${options}</select></label>`).join('')}</div><p class="offer-selection-status" role="status" aria-live="polite">Scegli ${offer.count===1?'la fragranza':`tutte le ${offer.count} fragranze`}.</p><button type="submit" class="offer-add" disabled>Aggiungi al carrello · ${euro(offer.priceCents/100)}</button></form>`).join('');
  host.querySelectorAll('form').forEach(form=>{
   const ids=()=>[...form.querySelectorAll('select')].map(s=>s.value);
   const status=form.querySelector('.offer-selection-status'),button=form.querySelector('button');
   form.addEventListener('change',()=>{const result=LotusCommerce.validateBundle(form.dataset.offer,ids(),data.products);button.disabled=!result.ok;status.textContent=result.ok?'Selezione completa · spedizione inclusa':result.error;});
   form.addEventListener('submit',e=>{e.preventDefault();const result=addBundle(form.dataset.offer,ids());if(!result.ok){status.textContent=result.error;button.disabled=true;return;}status.textContent='Pacchetto aggiunto al carrello.';});
  });
 }catch{host.innerHTML='<p role="alert">Impossibile caricare le offerte. Ricarica la pagina per riprovare.</p>';}
}
initializeOffers();
