const products=[];let cart=[],commerceCatalog=[],checkoutSettings={checkoutEndpoint:null,checkoutAllowedHosts:[]};
const euro=n=>LotusI18n.money(n);
const escapeCart=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderProducts(){}
function saveCart(){try{localStorage.setItem('lotus-bundle-cart',JSON.stringify(cart))}catch{}}
function initializeCommerce(catalog,config){
 commerceCatalog=catalog;checkoutSettings=config;
 try{const saved=JSON.parse(localStorage.getItem('lotus-bundle-cart')||'[]');cart=Array.isArray(saved)?saved.slice(0,20).filter(line=>line&&LotusCommerce.validateBundle(line.offerId,line.fragranceIds,catalog).ok).map(line=>({offerId:line.offerId,fragranceIds:[...line.fragranceIds]})):[]}catch{cart=[]}
 saveCart();renderCart();
}
function addBundle(offerId,fragranceIds){
 const result=LotusCommerce.validateBundle(offerId,fragranceIds,commerceCatalog);
 if(!result.ok)return result;
 if(cart.length>=20)return {ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};
 cart.push(result.line);saveCart();renderCart();openCart();return result;
}
function renderCart(){
 const holder=document.querySelector('#cart-items'),button=document.querySelector('#checkout'),status=document.querySelector('#checkout-status');
 let valid=true,total=0;
 try{total=LotusCommerce.totalCents(cart,commerceCatalog)}catch{valid=false}
 document.querySelector('#cart-count').textContent=cart.reduce((sum,line)=>sum+line.fragranceIds.length,0);
 holder.innerHTML=cart.length?cart.map((line,i)=>{
  const result=LotusCommerce.validateBundle(line.offerId,line.fragranceIds,commerceCatalog);
  if(!result.ok)return `<article class="cart-item"><p>${escapeCart(result.error)}</p><button data-index="${i}">Rimuovi</button></article>`;
  return `<article class="cart-item"><h4>${escapeCart(result.offer.name)}</h4><ul>${result.selected.map(p=>`<li>${escapeCart(p.name)} · 10 ml</li>`).join('')}</ul><p>${euro(result.offer.priceCents/100)} · Spedizione inclusa</p><button data-index="${i}">Rimuovi</button></article>`;
 }).join(''):'<p class="empty">Scegli le tue fragranze nelle offerte Discovery.</p>';
 holder.querySelectorAll('button').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.index),1);saveCart();renderCart()});
 document.querySelector('#cart-total').textContent=valid?euro(total/100):'Da verificare';
 button.disabled=!cart.length||!valid||!checkoutSettings.checkoutEndpoint;
 status.textContent=!valid?'Verifica le fragranze nel carrello.':!checkoutSettings.checkoutEndpoint?'Pagamento online non ancora attivo. Il carrello conserva la selezione, ma non vengono accettati pagamenti.':cart.length?'Pagamento sicuro online · spedizione inclusa':'Aggiungi un pacchetto per procedere.';
}
const drawer=document.querySelector('#cart-drawer'),scrim=document.querySelector('#scrim');
function openCart(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');scrim.classList.add('active');document.body.style.overflow='hidden';document.querySelector('#close-cart').focus()}
document.querySelector('#cart-button').onclick=openCart;
function closeCart(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');scrim.classList.remove('active');document.body.style.overflow='';document.querySelector('#cart-button').focus()}
document.querySelector('#close-cart').onclick=closeCart;scrim.onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))closeCart()});
document.querySelector('#checkout').onclick=async()=>{
 const button=document.querySelector('#checkout'),status=document.querySelector('#checkout-status');
 if(button.disabled||!cart.length||!checkoutSettings.checkoutEndpoint)return;
 try{
  LotusCommerce.totalCents(cart,commerceCatalog);button.disabled=true;status.textContent='Apertura del pagamento sicuro…';
  const endpoint=new URL(checkoutSettings.checkoutEndpoint,location.href);if(endpoint.protocol!=='https:')throw Error();
  const response=await fetch(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart.map(line=>({offerId:line.offerId,fragranceIds:line.fragranceIds}))})});
  if(!response.ok)throw Error();const data=await response.json(),url=new URL(data.url);
  if(url.protocol!=='https:'||!checkoutSettings.checkoutAllowedHosts.includes(url.hostname))throw Error();
  location.assign(url.href);
 }catch{renderCart();status.textContent='Impossibile aprire il pagamento. Nessun pagamento è stato effettuato; riprova più tardi.'}
};
renderCart();
const cookie=document.querySelector('#cookie-banner');if(localStorage.getItem('lotus-cookie-choice'))cookie.hidden=true;['#accept-cookies','#reject-cookies'].forEach(id=>document.querySelector(id).onclick=()=>{localStorage.setItem('lotus-cookie-choice',id==='#accept-cookies'?'accepted':'necessary');cookie.hidden=true});document.querySelector('#cookie-settings').onclick=e=>{e.preventDefault();cookie.hidden=false};
const legal={privacy:['Privacy policy','Questa pagina è una bozza editoriale, da completare con ragione sociale, contatti del titolare, DPO se applicabile, finalità, basi giuridiche, tempi di conservazione e fornitori effettivi. La raccolta dati deve rispettare GDPR, ePrivacy e la normativa applicabile nei Paesi raggiunti. I cookie non necessari devono restare disattivati fino a consenso libero, specifico e revocabile.'],terms:['Termini e condizioni','Bozza da sottoporre a consulenza legale prima della pubblicazione commerciale. Deve includere venditore, prezzi e imposte, disponibilità, conclusione del contratto, pagamenti, consegna, limitazioni, legge applicabile e foro competente. Per i consumatori UE occorre informare chiaramente sul diritto di recesso di 14 giorni e sulle eventuali eccezioni di legge.'],returns:['Resi e rimborsi','Bozza operativa: definire indirizzo e procedura di reso, tempi di rimborso e condizioni igieniche applicabili ai prodotti sigillati. Le regole devono rispettare le tutele inderogabili dei consumatori del mercato di vendita.']};const modal=document.querySelector('#legal-modal');document.querySelectorAll('[data-legal]').forEach(a=>a.onclick=e=>{e.preventDefault();let [h,p]=legal[a.dataset.legal];document.querySelector('#legal-content').innerHTML=`<p class="eyebrow">Lotus Fragrance · Bozza</p><h2>${h}</h2><p>${p}</p>`;modal.showModal()});document.querySelector('.modal-close').onclick=()=>modal.close();
