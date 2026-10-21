'use strict';
(()=>{
 const root=document.querySelector('#lotus-assistant');if(!root)return;
 const checkoutPage=!!document.querySelector('#checkout-items');
 const panel=document.querySelector('#assistant-panel'),launcher=document.querySelector('#assistant-launcher'),messages=document.querySelector('#assistant-messages'),form=document.querySelector('#assistant-form'),input=document.querySelector('#assistant-input'),toneChoice=document.querySelector('#assistant-tone-choice');
 let greeted=false,tone='neutral',toneSelected=false;
 const recommendation={active:false,style:null,category:null,shown:[],lastPrompt:''};
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
  const repeated=!!query&&query===recommendation.lastPrompt;
  if(query)recommendation.lastPrompt=query;
  const styles={dolce:['vaniglia','tonka','caramello','pralina','miele','cacao','gourmand'],fresco:['bergamotto','agrumi','lavanda','mela','pera','pompelmo','mandarino'],intenso:['oud','ambra','tabacco','patchouli','caffe','cuoio','muschio'],speziato:['pepe','cannella','zafferano','cardamomo','zenzero']};
  const styleAliases={dolce:/dolce|gourmand|cremos|vanigli/,fresco:/fresc|agrumat|pulito|legger|estiv/,intenso:/intens|decis|forte|persist|oriental/,speziato:/speziat|piccant|cald/};
  for(const [style,pattern] of Object.entries(styleAliases))if(pattern.test(query))recommendation.style=style;
  if(/donna|femmin/.test(query))recommendation.category='women';
  else if(/uomo|masch/.test(query))recommendation.category='men';
  else if(/mix|unisex|indifferent|qualsiasi|va bene tutto|non importa/.test(query))recommendation.category='mix';
  recommendation.active=true;
  if(repeated&&!recommendation.style&&!recommendation.category){
   const pool=(catalogNow()||[]).filter(item=>item.miniature?.availability==='available');
   const picks=['eclaire','asad'].map(id=>pool.find(item=>item.id===id)).filter(Boolean);
   recommendation.shown.push(...picks.map(item=>item.id));recommendation.active=false;
   return picks.length?`Certo, partiamo da due idee diverse: ${picks.map(item=>`${item.name} (${item.notes.slice(0,3).join(', ')})`).join(' oppure ')}. Quale ti ispira di più?`:'Dimmi se cerchi qualcosa di dolce, fresco, intenso o speziato e ti aiuto a scegliere.';
  }
  if(!recommendation.style)return 'Che tipo di profumo ti attira di più: dolce e avvolgente, fresco e pulito, intenso o speziato?';
  if(!recommendation.category)return `Perfetto, cerco qualcosa di ${recommendation.style}. Lo preferisci da donna, da uomo o va bene qualsiasi?`;
  const pool=(catalogNow()||[]).filter(item=>item.miniature?.availability==='available'&&(recommendation.category==='mix'||item.category===(recommendation.category==='women'?'arabi-donna':'arabi-uomo')));
  const terms=styles[recommendation.style];
  const ranked=pool.map(item=>{const text=normal(`${item.description} ${(item.notes||[]).join(' ')}`);const score=terms.reduce((sum,note)=>sum+(text.includes(normal(note))?1:0),0);return{item,score}}).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score);
  const matches=ranked.filter(({item})=>!recommendation.shown.includes(item.id)).slice(0,2);
  if(!matches.length)return 'Non ho altre corrispondenze disponibili con queste preferenze. Vuoi cambiare stile o provare un’altra categoria?';
  recommendation.shown.push(...matches.map(({item})=>item.id));recommendation.active=false;
  return `Per un profumo ${recommendation.style} ${recommendation.category==='women'?'da donna':recommendation.category==='men'?'da uomo':'senza una categoria specifica'}, guarderei ${matches.map(({item})=>`${item.name} (${item.notes.slice(0,3).join(', ')})`).join(' oppure ')}. Quale ti incuriosisce di più?`;
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
  if(/res[oi]|rimborso|recesso|restitui/.test(query))return 'La pagina Resi e rimborsi riassume il recesso UE entro 14 giorni e le regole sui prodotti sigillati. Per le modalità concrete di invio e assistenza, la pagina deve indicare un recapito operativo: apri Resi e rimborsi per leggere le informazioni pubblicate.';
  if(/pagamento|checkout|pagare/.test(query)){
   if((checkoutPage?checkoutConfig.checkoutEndpoint:checkoutSettings.checkoutEndpoint)){if(!checkoutPage)location.assign('checkout.html');return checkoutPage?'Sei già nella pagina di checkout sicuro.':'Ti porto al checkout sicuro.'}
   return 'Il checkout online è momentaneamente disattivato; non posso avviare un pagamento.';
  }
  if(/rimuovi|togli|elimina/.test(query)&&product)return removeProduct(product)?`Ho rimosso ${product.name} dal carrello. Le fragranze dentro un Tris o una Discovery Box vanno rimosse come pacchetto dal carrello.`:`Non trovo ${product.name} come voce singola nel carrello. Se è dentro un pacchetto, apri il carrello e rimuovi quel pacchetto.`;
  if(/aggiungi|metti|inserisci/.test(query)&&product){const result=addOne(product);return result.ok?`Aggiunto ${product.name} nel formato tascabile da 10 ml. Il totale aggiornato è nel carrello.`:result.error}
  if(product)return `${product.name}: ${product.description} Note in evidenza: ${product.notes.join(', ')}. Vuoi aggiungerlo? Scrivi “aggiungi ${product.name}”.`;
  const startsRecommendation=/consigli|sugger|ispirami|serve un profumo|cerco un profumo|vorrei un profumo|voglio un profumo/.test(query);
  if(startsRecommendation&&!recommendation.active){recommendation.style=null;recommendation.category=null;recommendation.shown=[]}
  if(/altre|altri|un altra|un altro|ancora/.test(query)&&recommendation.shown.length){recommendation.active=true;return recommend(query)}
  if(startsRecommendation||recommendation.active)return recommend(query);
  return 'Certo, dimmi che tipo di fragranza hai in mente e ti aiuto a trovare quella giusta.';
 }
 async function submit(text){const value=text.trim();if(!value)return;say(value,'user');input.value='';if(!catalogNow().length){try{const response=await fetch('products.json');if(response.ok){const loaded=(await response.json()).products;if(checkoutPage)checkoutCatalog=loaded;else commerceCatalog=loaded}}catch{}}const response=respond(value);say(toneSelected&&tone==='man'?(findProduct(value)?`Ottima scelta, hai gusto 😉 ${response}`:response.startsWith('Certo 😊')?response.replace('Certo 😊','Con piacere 😊'):`Con piacere 😊 ${response}`):response)}
 form.addEventListener('submit',event=>{event.preventDefault();submit(input.value)});
 root.querySelectorAll('[data-assistant-prompt]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.assistantPrompt)));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.dataset.open==='true')toggle(false)});
})();
