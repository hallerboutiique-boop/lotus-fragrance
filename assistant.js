'use strict';
(()=>{
 const root=document.querySelector('#lotus-assistant');if(!root)return;
 const checkoutPage=!!document.querySelector('#checkout-items');
 const panel=document.querySelector('#assistant-panel'),launcher=document.querySelector('#assistant-launcher'),messages=document.querySelector('#assistant-messages'),form=document.querySelector('#assistant-form'),input=document.querySelector('#assistant-input');
 let greeted=false;
 const catalogNow=()=>checkoutPage?checkoutCatalog:commerceCatalog;
 const cartNow=()=>checkoutPage?checkoutCart:cart;
 function syncCart(){if(checkoutPage){try{localStorage.setItem('lotus-bundle-cart',JSON.stringify(checkoutCart))}catch{}renderCheckout()}else{saveCart();renderCart()}}
 function say(text,who='assistant'){const node=document.createElement('p');node.className='assistant-message'+(who==='user'?' user':'');node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight}
 function toggle(force){const open=typeof force==='boolean'?force:root.dataset.open!=='true';root.dataset.open=String(open);panel.setAttribute('aria-hidden',String(!open));launcher.setAttribute('aria-expanded',String(open));if(open&&!greeted){greeted=true;say('Ciao, sono Mira, l’assistente virtuale di Lotus Fragrance. Posso consigliarti una fragranza o modificare il carrello. Prova: “aggiungi Lattafa Asad”, “Mystery Box donna”, “rimuovi l’ultima voce” o “svuota il carrello”.')}if(open)input.focus()}
 launcher.addEventListener('click',()=>toggle());document.querySelector('#assistant-close').addEventListener('click',()=>toggle(false));
 function normal(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
 function findProduct(text){const query=normal(text);return (catalogNow()||[]).filter(product=>query.includes(normal(product.name))||query.split(' ').some(word=>word.length>2&&normal(product.id)===word)).sort((a,b)=>normal(b.name).length-normal(a.name).length)[0]}
 function removeLast(){const items=cartNow();if(!items.length)return false;items.pop();syncCart();return true}
 function removeProduct(product){const items=cartNow();let removed=false;for(let i=items.length-1;i>=0;i--){const line=items[i];if(line.offerId==='singolo'&&line.fragranceIds?.includes(product.id)){items.splice(i,1);removed=true}}if(removed)syncCart();return removed}
 function addOne(product){if(checkoutPage){if(checkoutCart.length>=20)return{ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};const result=LotusCommerce.validateBundle('singolo',[product.id],checkoutCatalog);if(!result.ok)return result;checkoutCart.push(result.line);syncCart();return result}return addBundle('singolo',[product.id])}
 function addBox(gender){if(checkoutPage){if(checkoutCart.length>=20)return{ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};const result=LotusCommerce.validateLine({offerId:'mystery',gender},checkoutCatalog);if(!result.ok)return result;checkoutCart.push(result.line);syncCart();return result}return addMystery(gender)}
 function respond(text){const query=normal(text),product=findProduct(text);
  if(/^(ciao|salve|buongiorno|buonasera|hey)( |$)/.test(query))return 'Ciao! Dimmi quale profumo ti incuriosisce oppure chiedimi di aggiungerlo al carrello.';
  if(/svuota|cancella tutto|elimina tutto/.test(query)){cart.splice(0);saveCart();renderCart();return 'Fatto, ho svuotato il carrello.'}
  if(/rimuovi|togli|elimina/.test(query)&&/(ultimo|ultima|voce|pacchetto|offerta)/.test(query))return removeLast()?'Ho rimosso l’ultima voce dal carrello.':'Il carrello è già vuoto.';
  if(/carrello/.test(query)&&/(apri|mostra|vedi|controlla)/.test(query)){if(checkoutPage)location.assign('index.html#carrello');else openCart();return 'Ecco il carrello: da lì puoi controllare i prodotti, i formati e il totale.'}
  if(/mystery|scatola misteriosa|box casuale/.test(query)){
   const gender=/donna|femmin/.test(query)?'women':/uomo|masch/.test(query)?'men':/mix|misto/.test(query)?'mix':null;
   if(!gender)return 'Per la Mystery Box scegli una preferenza: Uomo, Donna o Mix.';
   const result=addBox(gender);return result.ok?'Ho aggiunto una Mystery Box da 5 profumi da 10 ml, selezionati casualmente. Puoi verificare il totale nel carrello.':result.error;
  }
  if(/consigli|sugger|ispirami/.test(query)){
   const pool=catalogNow().filter(item=>item.miniature?.availability==='available');
   const suggestions=pool.slice(0,3).map(item=>`${item.name}: ${item.description}`).join('\n');
   return suggestions||'Sto caricando il catalogo: riprova tra un momento.';
  }
  if(/res[oi]|rimborso|recesso|restitui/.test(query))return 'La pagina Resi e rimborsi riassume il recesso UE entro 14 giorni e le regole sui prodotti sigillati. Per le modalità concrete di invio e assistenza, la pagina deve indicare un recapito operativo: apri Resi e rimborsi per leggere le informazioni pubblicate.';
  if(/pagamento|checkout|pagare/.test(query)){
   if((checkoutPage?checkoutConfig.checkoutEndpoint:checkoutSettings.checkoutEndpoint)){if(!checkoutPage)location.assign('checkout.html');return checkoutPage?'Sei già nella pagina di checkout sicuro.':'Ti porto al checkout sicuro.'}
   return 'Il checkout online è momentaneamente disattivato; non posso avviare un pagamento.';
  }
  if(/rimuovi|togli|elimina/.test(query)&&product)return removeProduct(product)?`Ho rimosso ${product.name} dal carrello. Le fragranze dentro un Tris o una Discovery Box vanno rimosse come pacchetto dal carrello.`:`Non trovo ${product.name} come voce singola nel carrello. Se è dentro un pacchetto, apri il carrello e rimuovi quel pacchetto.`;
  if(/aggiungi|metti|inserisci/.test(query)&&product){const result=addOne(product);return result.ok?`Aggiunto ${product.name} nel formato tascabile da 10 ml. Il totale aggiornato è nel carrello.`:result.error}
  if(product)return `${product.name}: ${product.description} Note in evidenza: ${product.notes.join(', ')}. Vuoi aggiungerlo? Scrivi “aggiungi ${product.name}”.`;
  return 'Posso consigliarti profumi, aggiungere una fragranza da 10 ml, inserire una Mystery Box Uomo/Donna/Mix, rimuovere l’ultima voce o svuotare il carrello. Per una fragranza specifica scrivi il suo nome.';
 }
 async function submit(text){const value=text.trim();if(!value)return;say(value,'user');input.value='';if(!catalogNow().length){try{const response=await fetch('products.json');if(response.ok){const loaded=(await response.json()).products;if(checkoutPage)checkoutCatalog=loaded;else commerceCatalog=loaded}}catch{}}say(respond(value))}
 form.addEventListener('submit',event=>{event.preventDefault();submit(input.value)});
 root.querySelectorAll('[data-assistant-prompt]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.assistantPrompt)));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.dataset.open==='true')toggle(false)});
})();
