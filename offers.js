async function initializeOffers(){
 const host=document.querySelector('#offer-grid');
 try{
  const responses=await Promise.all([fetch('products.json?v=offers1',{cache:'no-cache'}),fetch('commerce-config.json',{cache:'no-cache'})]);
  if(responses.some(r=>!r.ok))throw Error();
  const [data,config]=await Promise.all(responses.map(r=>r.json()));initializeCommerce(data.products,config);
  const copy={singolo:'Aggiungi 1 profumo da 10 ml dal catalogo: 14,90 €, spedizione gratuita.',tris:'Aggiungi 3 profumi da 10 ml dal catalogo: il totale diventa automaticamente 32,90 € al checkout. Risparmi 11,80 € rispetto a tre singoli.',box:'5 profumi da 10 ml a sorpresa: li scegliamo noi casualmente al checkout. Scegli solo Uomo, Donna o Mix. Totale 49,90 €, spedizione gratuita.'};
  host.innerHTML=LotusCommerce.offers.map(offer=>`<article class="offer-card ${offer.recommended?'offer-recommended':''}" data-offer="${offer.id}">${offer.recommended?'<p class="offer-badge">Più scelto</p>':''}<p class="offer-kicker">${offer.count} ${offer.count===1?'flacone':'flaconi'} · 10 ml ciascuno</p><h3>${offer.name}</h3><p class="offer-price">${euro(offer.priceCents/100)}</p><p class="offer-shipping">Spedizione gratuita</p><p class="offer-instruction">${copy[offer.id]}</p>${offer.id==='box'?'<form id="mystery-form"><div class="offer-selectors"><label for="mystery-gender">Composizione Mystery Box<select id="mystery-gender" required><option value="">Scegli Uomo, Donna o Mix</option><option value="men">Uomo</option><option value="women">Donna</option><option value="mix">Mix</option></select></label></div><p class="offer-selection-status" role="status" aria-live="polite">Le fragranze della Mystery Box non si scelgono singolarmente.</p><button class="offer-add" type="submit" disabled>Aggiungi Mystery Box</button></form>':'<a class="offer-add" href="#collezione">Scegli dal catalogo</a>'}</article>`).join('');
  const form=host.querySelector('#mystery-form'),select=form.querySelector('select'),button=form.querySelector('button');
  select.onchange=()=>{button.disabled=!LotusCommerce.validateLine({offerId:'mystery',gender:select.value},data.products).ok;form.querySelector('[role="status"]').textContent=select.value==='women'?'Nella selezione Donna una fragranza può ripetersi.':'Le fragranze della Mystery Box non si scelgono singolarmente.'};
  form.onsubmit=e=>{e.preventDefault();const result=addMystery(select.value);if(!result.ok)form.querySelector('[role="status"]').textContent=result.error};
 }catch{host.innerHTML='<p role="alert">Impossibile caricare le offerte. Ricarica la pagina per riprovare.</p>'}
}
initializeOffers();
