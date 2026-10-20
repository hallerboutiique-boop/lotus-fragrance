const products=[];let cart=[],commerceCatalog=[],checkoutSettings={checkoutEndpoint:null,checkoutAllowedHosts:[]};
const euro=n=>LotusI18n.money(n);
const escapeCart=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderProducts(){}
function saveCart(){try{localStorage.setItem('lotus-bundle-cart',JSON.stringify(cart))}catch{}}
function initializeCommerce(catalog,config){
 commerceCatalog=catalog;checkoutSettings=config;
 try{const saved=JSON.parse(localStorage.getItem('lotus-bundle-cart')||'[]');cart=Array.isArray(saved)?saved.slice(0,20).map(line=>LotusCommerce.validateLine(line,catalog)).filter(result=>result.ok).map(result=>result.line):[]}catch{cart=[]}
 saveCart();renderCart();if(location.hash==='#carrello')openCart();
}
function addBundle(offerId,fragranceIds){
 const result=LotusCommerce.validateBundle(offerId,fragranceIds,commerceCatalog);
 if(!result.ok)return result;
 if(cart.length>=20)return {ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};
 cart.push(result.line);saveCart();renderCart();openCart();return result;
}
function addMystery(gender){
 const result=LotusCommerce.validateLine({offerId:'mystery',gender},commerceCatalog);
 if(!result.ok)return result;
 if(cart.length>=20)return {ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};
 cart.push(result.line);saveCart();renderCart();openCart();return result;
}
function renderCart(){
 const holder=document.querySelector('#cart-items'),button=document.querySelector('#checkout'),status=document.querySelector('#checkout-status');
 let valid=true,total=0;
 try{total=LotusCommerce.totalCents(cart,commerceCatalog)}catch{valid=false}
 document.querySelector('#cart-count').textContent=cart.reduce((sum,line)=>sum+(line.offerId==='mystery'?5:line.fragranceIds.length),0);
 holder.innerHTML=cart.length?cart.map((line,i)=>{
  const result=LotusCommerce.validateLine(line,commerceCatalog);
  if(!result.ok)return `<article class="cart-item"><p>${escapeCart(result.error)}</p><button data-index="${i}">Rimuovi</button></article>`;
  if(line.offerId==='mystery')return `<article class="cart-item"><div class="cart-mystery-preview" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/><path d="M10 7a2 2 0 0 1 4 0c0 1-2 1-2 2"/><path d="M12 11h.01"/></svg></div><h4>Mystery Box · ${{men:'Uomo',women:'Donna',mix:'Mix'}[line.gender]}</h4><p>5 profumi da 10 ml scelti casualmente da noi al checkout.</p><p>${euro(49.9)} · Spedizione inclusa</p><button data-index="${i}">Rimuovi</button></article>`;
  const standard=line.offerId==='standard';return `<article class="cart-item"><h4>${escapeCart(line.offerId==='box'?'Discovery Box':result.offer.name)}</h4><ul class="cart-product-list">${result.selected.map(p=>{const format=standard?'Confezione normale':'10 ml',image=standard?p.image:p.miniature.image;return `<li><a href="product.html?id=${encodeURIComponent(p.id)}${standard?'':'&format=10ml'}"><img src="${escapeCart(image)}" alt="${escapeCart(p.name)} · ${format}" width="76" height="76"/><span>${escapeCart(p.name)}<small>${format}</small></span></a></li>`}).join('')}</ul><p>${euro((line.offerId==='box'?result.offer.priceCents:standard?result.offer.priceCents:result.selected.length*1490)/100)} · Spedizione inclusa</p>${standard?'<p>Disponibilità da confermare.</p>':''}<button data-index="${i}">Rimuovi</button></article>`;
 }).join(''):'<p class="empty">Scegli i profumi dal catalogo oppure aggiungi una Mystery Box.</p>';
 holder.querySelectorAll('button').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.index),1);saveCart();renderCart()});
 const discount=document.querySelector('#cart-discount');
 if(discount){const savings=valid?LotusCommerce.quote(cart,commerceCatalog).savingsCents:0;discount.hidden=!savings;discount.textContent=savings?LotusI18n.translate('Sconto Tris automatico')+' · −'+euro(savings/100):''}
 document.querySelector('#cart-total').textContent=valid?euro(total/100):'Da verificare';
 button.disabled=!cart.length||!valid;
 status.textContent=!valid?'Verifica le fragranze nel carrello.':!checkoutSettings.checkoutEndpoint?'Pagamento online momentaneamente non disponibile.':cart.length?'Rivedi l’ordine e prosegui al pagamento sicuro':'Aggiungi un pacchetto per procedere.';
}
const drawer=document.querySelector('#cart-drawer'),scrim=document.querySelector('#scrim');
function openCart(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');scrim.classList.add('active');document.body.style.overflow='hidden';document.querySelector('#close-cart').focus()}
document.querySelector('#cart-button').onclick=openCart;
function closeCart(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');scrim.classList.remove('active');document.body.style.overflow='';document.querySelector('#cart-button').focus()}
document.querySelector('#close-cart').onclick=closeCart;scrim.onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))closeCart()});
document.querySelector('#checkout').onclick=()=>{if(!document.querySelector('#checkout').disabled)location.assign('checkout.html')};
renderCart();
const cookie=document.querySelector('#cookie-banner');if(localStorage.getItem('lotus-cookie-choice'))cookie.hidden=true;['#accept-cookies','#reject-cookies'].forEach(id=>document.querySelector(id).onclick=()=>{localStorage.setItem('lotus-cookie-choice',id==='#accept-cookies'?'accepted':'necessary');cookie.hidden=true});document.querySelector('#cookie-settings').onclick=e=>{e.preventDefault();cookie.hidden=false};
