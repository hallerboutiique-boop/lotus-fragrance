'use strict';
const escapeCheckout=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const checkoutMoney=cents=>window.LotusI18n?LotusI18n.money(cents/100):new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
const itemsNode=document.querySelector('#checkout-items'),totalNode=document.querySelector('#checkout-total'),button=document.querySelector('#checkout-pay'),statusNode=document.querySelector('#checkout-status'),legalCheckbox=document.querySelector('#checkout-legal');
let checkoutCart=[],checkoutCatalog=[],checkoutConfig={},appliedDiscountCode='',appliedDiscountCents=0,discountValid=false;
async function initializeCheckout(){
 try{
  const [productsResponse,configResponse]=await Promise.all([fetch('https://lotus-fragrance-accounts.fly.dev/api/catalog',{cache:'no-cache'}),fetch('commerce-config.json',{cache:'no-cache'})]);
  if(!productsResponse.ok||!configResponse.ok)throw Error();
  checkoutCatalog=(await productsResponse.json()).products;checkoutConfig=await configResponse.json();
  const saved=JSON.parse(localStorage.getItem('lotus-bundle-cart')||'[]');
  checkoutCart=Array.isArray(saved)?saved.slice(0,20).map(line=>LotusCommerce.validateLine(line,checkoutCatalog)).filter(result=>result.ok).map(result=>result.line):[];
  if(checkoutCart.length)window.LotusAnalytics?.event('checkout_start');
  renderCheckout();
 }catch{itemsNode.innerHTML='<p role="alert">Non riesco a caricare il carrello. Torna allo shop e riprova.</p>';statusNode.textContent='Checkout non disponibile.'}
}
function renderCheckout(){
 if(!checkoutCart.length){itemsNode.innerHTML='<p>Il carrello è vuoto. Torna allo shop per scegliere le fragranze.</p>';totalNode.textContent=checkoutMoney(0);button.disabled=true;statusNode.textContent='Aggiungi prima una fragranza o una Mystery Box.';return}
 let quote;try{quote=LotusCommerce.quote(checkoutCart,checkoutCatalog)}catch{itemsNode.innerHTML='<p role="alert">Una selezione non è più disponibile. Torna al carrello per aggiornarla.</p>';totalNode.textContent='—';button.disabled=true;return}
 let index=0;
 const productRows=checkoutCart.map(line=>{
  const result=LotusCommerce.validateLine(line,checkoutCatalog);
  if(line.offerId==='mystery')return `<article class="checkout-row"><div class="mystery-thumb" aria-hidden="true">◇</div><div><h3>Mystery Box · ${{men:'Uomo',women:'Donna',mix:'Mix'}[line.gender]}</h3><p>5 fragranze da 10 ml scelte casualmente · Spedizione gratuita</p></div><strong>€49,90</strong></article>`;
  return result.selected.map(product=>{const standard=line.offerId==='standard',price=standard?result.offer.priceCents:line.offerId==='box'?Math.round(result.offer.priceCents/result.selected.length):1490,image=standard?product.image:product.miniature.image,format=standard?'Confezione normale':'Formato tascabile · 10 ml';return `<article class="checkout-row"><img src="${escapeCheckout(image)}" alt="${escapeCheckout(product.name)}" width="68" height="76"><div><h3>${escapeCheckout(product.name)}</h3><p>${format}${line.offerId==='tris'?' · Tris':''}${standard?' · Disponibilità da confermare':''} · Spedizione gratuita</p></div><strong>${checkoutMoney(price)}</strong></article>`}).join('');
 }).join('');
 const discountRow=quote.savingsCents?`<article class="checkout-row checkout-discount"><div class="mystery-thumb" aria-hidden="true">−</div><div><h3>Sconto Tris automatico</h3><p>Applicato al checkout</p></div><strong>−${checkoutMoney(quote.savingsCents)}</strong></article>`:'';
 itemsNode.innerHTML=productRows+discountRow;
 totalNode.textContent=checkoutMoney(Math.max(0,quote.totalCents-appliedDiscountCents));
 const endpoint=typeof checkoutConfig.checkoutEndpoint==='string'?checkoutConfig.checkoutEndpoint:'';
 const unconfirmedStandard=checkoutCart.some(line=>line.offerId==='standard'&&line.fragranceIds.some(id=>checkoutCatalog.find(product=>product.id===id)?.availability!=='available'));
 let endpointSafe=false;
 try{const url=new URL(endpoint,location.href);endpointSafe=url.protocol==='https:'&&url.pathname==='/checkout'&&url.hostname==='lotus-fragrance-checkout.fly.dev'}catch{}
 button.disabled=!endpointSafe||!legalCheckbox.checked||unconfirmedStandard;
 statusNode.textContent=!endpointSafe?'Pagamento online temporaneamente non disponibile.':unconfirmedStandard?'La disponibilità della confezione normale non è confermata: rimuovila dal carrello o scegli il formato da 10 ml.':!legalCheckbox.checked?'Accetta i Termini e condizioni per proseguire.':'Checkout online attivo: inserirai indirizzo e metodo di pagamento nella pagina Stripe protetta.';
}
legalCheckbox.addEventListener('change',renderCheckout);
button.addEventListener('click',async()=>{
 if(button.disabled)return;
 button.disabled=true;statusNode.textContent='Apertura del pagamento sicuro…';
 try{
  const endpoint=new URL(checkoutConfig.checkoutEndpoint,location.href);
  const response=await fetch(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':globalThis.crypto.randomUUID()},body:JSON.stringify({legalAccepted:legalCheckbox.checked,discountCode:appliedDiscountCode,items:checkoutCart.map(line=>line.offerId==='mystery'?{offerId:'mystery',gender:line.gender}:{offerId:line.offerId,fragranceIds:line.fragranceIds})})});
  if(!response.ok)throw Error();const data=await response.json(),url=new URL(data.url);
  if(url.protocol!=='https:'||!checkoutConfig.checkoutAllowedHosts?.includes(url.hostname))throw Error();location.assign(url.href);
 }catch{statusNode.textContent='Pagamento non disponibile al momento. Nessun addebito è stato effettuato.';button.disabled=false}
});
initializeCheckout();
document.querySelector('#apply-discount').addEventListener('click',async()=>{const status=document.querySelector('#discount-status'),code=document.querySelector('#discount-code').value.trim().toUpperCase();if(!code){appliedDiscountCode='';appliedDiscountCents=0;discountValid=false;status.textContent='Nessun codice inserito.';renderCheckout();return}try{const response=await fetch('https://lotus-fragrance-accounts.fly.dev/api/checkout/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:checkoutCart.map(line=>line.offerId==='mystery'?{offerId:'mystery',gender:line.gender}:{offerId:line.offerId,fragranceIds:line.fragranceIds}),discountCode:code})});if(!response.ok)throw Error();const quote=await response.json();appliedDiscountCode=code;appliedDiscountCents=quote.discountCents;discountValid=true;totalNode.textContent=checkoutMoney(quote.totalCents);status.textContent=`Codice applicato · −${checkoutMoney(quote.discountCents)} (${quote.discountPercent}%).`;button.disabled=!legalCheckbox.checked}catch{appliedDiscountCode='';appliedDiscountCents=0;discountValid=false;status.textContent='Codice non valido o scaduto.';renderCheckout()}});
document.querySelector('#discount-code').addEventListener('input',()=>{appliedDiscountCode='';appliedDiscountCents=0;discountValid=false;document.querySelector('#discount-status').textContent='Applica il codice per verificare lo sconto.';renderCheckout()});
