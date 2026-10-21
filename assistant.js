'use strict';
(()=>{
 const root=document.querySelector('#lotus-assistant');if(!root)return;
 const checkoutPage=!!document.querySelector('#checkout-items');
 const panel=document.querySelector('#assistant-panel'),launcher=document.querySelector('#assistant-launcher'),messages=document.querySelector('#assistant-messages'),form=document.querySelector('#assistant-form'),input=document.querySelector('#assistant-input'),toneChoice=document.querySelector('#assistant-tone-choice');
 let greeted=false,tone='neutral',toneSelected=false;
 const catalogNow=()=>checkoutPage?checkoutCatalog:commerceCatalog;
 const cartNow=()=>checkoutPage?checkoutCart:cart;
 function syncCart(){if(checkoutPage){try{localStorage.setItem('lotus-bundle-cart',JSON.stringify(checkoutCart))}catch{}renderCheckout()}else{saveCart();renderCart()}}
 function say(text,who='assistant'){const node=document.createElement('p');node.className='assistant-message'+(who==='user'?' user':'');node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight}
 function toggle(force){const open=typeof force==='boolean'?force:root.dataset.open!=='true';root.dataset.open=String(open);panel.setAttribute('aria-hidden',String(!open));launcher.setAttribute('aria-expanded',String(open));if(open&&!greeted){greeted=true;say('Ciao, sono Stella, l’assistente virtuale di Lotus Fragrance. Posso consigliarti una fragranza o modificare il carrello. Come preferisci che mi rivolga a te?');toneChoice.hidden=false}if(open)input.focus()}
 toneChoice.addEventListener('click',event=>{const button=event.target.closest('[data-assistant-tone]');if(!button)return;tone=button.dataset.assistantTone;toneSelected=true;toneChoice.hidden=true;say(tone==='woman'?'Perfetto, userò un tono professionale e diretto.':tone==='man'?'Perfetto, sarò più calorosa e un po’ giocosa, sempre con rispetto.':'Va bene, manterrò un tono cortese e neutro.')});
 launcher.addEventListener('click',()=>toggle());document.querySelector('#assistant-close').addEventListener('click',()=>toggle(false));
 function normal(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
 function findProduct(text){const query=normal(text);return (catalogNow()||[]).filter(product=>query.includes(normal(product.name))||query.split(' ').some(word=>word.length>2&&normal(product.id)===word)).sort((a,b)=>normal(b.name).length-normal(a.name).length)[0]}
 function removeLast(){const items=cartNow();if(!items.length)return false;items.pop();syncCart();return true}
 function removeProduct(product){const items=cartNow();let removed=false;for(let i=items.length-1;i>=0;i--){const line=items[i];if(line.offerId==='singolo'&&line.fragranceIds?.includes(product.id)){items.splice(i,1);removed=true}}if(removed)syncCart();return removed}
 function addOne(product){if(checkoutPage){if(checkoutCart.length>=20)return{ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};const result=LotusCommerce.validateBundle('singolo',[product.id],checkoutCatalog);if(!result.ok)return result;checkoutCart.push(result.line);syncCart();return result}return addBundle('singolo',[product.id])}
 function addBox(gender){if(checkoutPage){if(checkoutCart.length>=20)return{ok:false,error:'Puoi inserire al massimo 20 pacchetti per ordine.'};const result=LotusCommerce.validateLine({offerId:'mystery',gender},checkoutCatalog);if(!result.ok)return result;checkoutCart.push(result.line);syncCart();return result}return addMystery(gender)}
 function recommend(query){
  const gender=/donna|femmin/.test(query)?'women':/uomo|masch/.test(query)?'men':null;
  const styles={dolce:['vaniglia','tonka','caramello','pralina','miele','cacao'],fresco:['bergamotto','agrumi','lavanda','mela','pera','fresco'],intenso:['oud','ambra','tabacco','patchouli','caffe','intenso'],speziato:['pepe','cannella','zafferano','cardamomo','speziato']};
  const requestedStyles=Object.keys(styles).filter(style=>new RegExp(`\\b${style}\\b`).test(query));
  const requested=requestedStyles.map(style=>styles[style]);
  if(!gender&&!requested.length)return 'Certo 😊 Che stile cerchi: dolce, fresco, intenso o speziato? E lo preferisci da uomo, da donna o vuoi esplorare liberamente?';
  if(gender&&!requested.length)return `Va bene, cerchiamo un profumo da ${gender==='women'?'donna':'uomo'}. Lo preferisci dolce, fresco, intenso o speziato?`;
  let pool=(catalogNow()||[]).filter(item=>item.miniature?.availability==='available');
  if(gender)pool=pool.filter(item=>item.category===(gender==='women'?'arabi-donna':'arabi-uomo'));
  const ranked=pool.map(item=>{const text=normal(`${item.description} ${(item.notes||[]).join(' ')}`);const score=requested.flat().reduce((sum,note)=>sum+(text.includes(normal(note))?1:0),0);return{item,score}}).sort((a,b)=>b.score-a.score);
  const matches=ranked.filter(entry=>entry.score>0).slice(0,2);
  if(!matches.length)return 'Non trovo una corrispondenza precisa nel catalogo per quelle note. Ti va di provare con uno stile dolce, fresco, intenso o speziato?';
  return `Per uno stile ${requestedStyles.join(' e ')} potresti provare ${matches.map(({item})=>`${item.name} — ${item.description}`).join(' Oppure ')}. Vuoi che ti aiuti a scegliere tra questi?`;
 }
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
  if(/consigli|sugger|ispirami|serve un profumo|cerco un profumo|vorrei un profumo|voglio un profumo/.test(query))return recommend(query);
  if(/res[oi]|rimborso|recesso|restitui/.test(query))return 'La pagina Resi e rimborsi riassume il recesso UE entro 14 giorni e le regole sui prodotti sigillati. Per le modalità concrete di invio e assistenza, la pagina deve indicare un recapito operativo: apri Resi e rimborsi per leggere le informazioni pubblicate.';
  if(/pagamento|checkout|pagare/.test(query)){
   if((checkoutPage?checkoutConfig.checkoutEndpoint:checkoutSettings.checkoutEndpoint)){if(!checkoutPage)location.assign('checkout.html');return checkoutPage?'Sei già nella pagina di checkout sicuro.':'Ti porto al checkout sicuro.'}
   return 'Il checkout online è momentaneamente disattivato; non posso avviare un pagamento.';
  }
  if(/rimuovi|togli|elimina/.test(query)&&product)return removeProduct(product)?`Ho rimosso ${product.name} dal carrello. Le fragranze dentro un Tris o una Discovery Box vanno rimosse come pacchetto dal carrello.`:`Non trovo ${product.name} come voce singola nel carrello. Se è dentro un pacchetto, apri il carrello e rimuovi quel pacchetto.`;
  if(/aggiungi|metti|inserisci/.test(query)&&product){const result=addOne(product);return result.ok?`Aggiunto ${product.name} nel formato tascabile da 10 ml. Il totale aggiornato è nel carrello.`:result.error}
  if(product)return `${product.name}: ${product.description} Note in evidenza: ${product.notes.join(', ')}. Vuoi aggiungerlo? Scrivi “aggiungi ${product.name}”.`;
  return 'Certo, dimmi che tipo di fragranza hai in mente e ti aiuto a trovare quella giusta.';
 }
 async function submit(text){const value=text.trim();if(!value)return;say(value,'user');input.value='';if(!catalogNow().length){try{const response=await fetch('products.json');if(response.ok){const loaded=(await response.json()).products;if(checkoutPage)checkoutCatalog=loaded;else commerceCatalog=loaded}}catch{}}const response=respond(value);say(toneSelected&&tone==='man'?(findProduct(value)?`Ottima scelta, hai gusto 😉 ${response}`:response.startsWith('Certo 😊')?response.replace('Certo 😊','Con piacere 😊'):`Con piacere 😊 ${response}`):response)}
 form.addEventListener('submit',event=>{event.preventDefault();submit(input.value)});
 root.querySelectorAll('[data-assistant-prompt]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.assistantPrompt)));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.dataset.open==='true')toggle(false)});
})();
