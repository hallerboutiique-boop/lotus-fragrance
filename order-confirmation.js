'use strict';
(async function verifyOrder(){
  const title=document.querySelector('#order-title'),status=document.querySelector('#order-status'),total=document.querySelector('#order-total');
  const sessionId=new URLSearchParams(location.search).get('session_id')||'';
  const endpoint='https://lotus-fragrance-checkout.fly.dev/order-status?session_id='+encodeURIComponent(sessionId);
  if(!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)){title.textContent='Ordine non verificabile';status.textContent='Il link di conferma non contiene una sessione valida. Controlla il profilo cliente o contatta l’assistenza.';return}
  try{
    const response=await fetch(endpoint,{headers:{accept:'application/json'}}),result=await response.json();
    if(!response.ok)throw new Error('status');
    if(result.status==='paid'){
      title.textContent='Grazie per il tuo ordine';
      status.textContent='Pagamento confermato. L’ordine sarà visibile nel tuo profilo cliente dopo la registrazione dell’evento di pagamento.';
      if(Number.isSafeInteger(result.totalCents)&&result.totalCents>0)total.textContent=new Intl.NumberFormat('it-IT',{style:'currency',currency:result.currency||'EUR'}).format(result.totalCents/100);
    }else if(result.status==='expired'){
      title.textContent='Sessione scaduta';status.textContent='La sessione di pagamento è scaduta e non risulta completata. Puoi tornare al catalogo e riprovare.';
    }else{
      title.textContent='Pagamento in verifica';status.textContent='Il pagamento non risulta ancora completato. Attendi qualche istante e aggiorna questa pagina; non effettuare un nuovo ordine finché lo stato è in verifica.';
    }
  }catch{title.textContent='Conferma in verifica';status.textContent='Non è stato possibile verificare lo stato del pagamento ora. Aggiorna questa pagina tra poco oppure controlla il tuo profilo cliente.'}
})();
