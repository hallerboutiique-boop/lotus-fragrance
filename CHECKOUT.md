# Offerte 10 ml e checkout online

Offerte autorizzate: Singolo 1 × 10 ml €14,90; Tris 3 × 10 ml €32,90, automatico sui flaconi scelti; Mystery Box 5 × 10 ml €49,90, estrazione casuale secondo la preferenza Uomo/Donna/Mix. Spedizione inclusa. Il Tris è evidenziato come «Più scelto» su richiesta del titolare, non sulla base di statistiche di vendita.

Il titolare ha confermato disponibili tutti i 9 profumi in formato 10 ml. È stato aggiornato solo `miniature.availability`; nessun prezzo del catalogo è stato cambiato. I prezzi dei pacchetti risiedono in `commerce-core.js` come importi interi in centesimi. Le schede del catalogo mantengono i loro dati commerciali separati; quando il prezzo singolo 10 ml non è valorizzato, mostrano la tariffa Singolo di €14,90 senza modificare i campi prezzo del JSON. Eventuali prezzi già impostati restano prioritari.

## Stato reale

Le offerte e il carrello funzionano. Il backend dedicato è distribuito come app Fly `lotus-fragrance-checkout` (`https://lotus-fragrance-checkout.fly.dev`), distinta dalle altre app dell'account. La chiave Stripe live e il secret di firma del webhook sono conservati solo come secret Fly. Il servizio account (`https://lotus-fragrance-accounts.fly.dev`) riceve gli eventi Stripe firmati e salva ordini e indirizzi sul volume persistente già esistente; il profilo mostra la cronologia degli ordini. La pagina statica di conferma verifica lo stato direttamente con Stripe senza esporre email o dettagli personali. Checkout live è configurato e protetto da convalida server-side, idempotenza e verifica webhook; l'endpoint pubblico è `https://lotus-fragrance-checkout.fly.dev/checkout`. Il checkout richiede l'accettazione dei Termini e condizioni. Non completare acquisti di prova con pagamenti reali.

Il backend usa il catalogo come fonte server-side, convalida ID/disponibilità, ricalcola i totali, applica il Tris ogni 3 flaconi e assegna i prodotti Mystery sul server. Invia a Stripe Checkout solo l'importo ricalcolato, metodi online disponibili nell'account, indirizzo di spedizione in Italia e spedizione a zero. I test locali sono in `checkout-server.test.cjs`.

I test locali coprono validazione degli ordini, accettazione delle condizioni, verifica della firma, deduplicazione webhook, visibilità dell'ordine solo nell'account cliente e verifica della pagina di conferma. Il webhook è registrato su Stripe per `checkout.session.completed` e `checkout.session.async_payment_succeeded`. Il tracciamento automatico non è incluso: il codice di tracking non è aggiornabile tramite un pannello operativo e va gestito manualmente. I prezzi del formato normale sono €59 per i profumi da uomo e €49 per quelli da donna. Il formato normale resta non acquistabile finché il venditore non conferma l'inventario; le offerte da 10 ml risultano disponibili.

## Collegamento a un checkout reale

Occorre un endpoint HTTPS di un backend di fiducia collegato all'account di pagamento live del titolare. Non inserire chiavi segrete nel repository. `POST` riceve `items` con righe scelte `{offerId,fragranceIds}` o Mystery `{offerId:'mystery',gender}`; il client non invia totali autorevoli. Risposta attesa: `{ "url": "https://checkout.stripe.com/..." }`. Sono consentiti solo gli hostname configurati in `checkoutAllowedHosts`.

Il backend deve:

- convalidare gli ID delle offerte e l'esatto numero di fragranze per riga, consentendo ripetizioni;
- verificare disponibilità e scorte reali e ricalcolare i prezzi dalle proprie tariffe affidabili;
- applicare spedizione a costo zero, senza introdurre sovrapprezzi non dichiarati;
- creare una sessione di pagamento solo online con i metodi configurati e abilitati nell'account Stripe del titolare;
- richiedere al cliente l'accettazione delle condizioni e registrare la versione accettata nei metadati della sessione;
- registrare la lista delle fragranze dell'ordine per la preparazione;
- confermare il pagamento tramite webhook verificato prima di evadere l'ordine, con idempotenza e controlli di sicurezza;
- non fidarsi dei controlli frontend, dei prezzi o della disponibilità salvati nel browser.

Il carrello locale conserva ID delle offerte e delle fragranze, o la preferenza Mystery, non dati di pagamento. Test locali: `node commerce.test.cjs`.

## Aggiornamento offerte: Tris automatico e Mystery Box

Le offerte sono ora all'inizio della home, subito dopo l'hero. Singolo 14,90 €, Tris 32,90 € ogni gruppo di 3 flaconi da 10 ml scelti nel catalogo, Mystery Box 49,90 € per 5 flaconi. Spedizione inclusa. I formati normali restano invariati.

Il carrello anticipa il totale scontato: 3 singoli = 32,90 €, 4 = 47,80 €, 6 = 65,80 €. La Mystery Box non contribuisce alla soglia Tris ed è una riga separata. I pacchetti precedentemente salvati sono conservati.

La richiesta checkout invia le righe scelte con gli ID delle fragranze, oppure `{offerId:'mystery',gender:'men'|'women'|'mix'}`, senza contenuti casuali o prezzi autorevoli dal client. Il futuro backend deve usare `quote` per ricalcolare prezzi e disponibilità e `resolveMystery(gender,catalog,crypto.randomInt)` per assegnare 5 ID realmente disponibili, persistendo l'estrazione nell'ordine con chiave di idempotenza. Non riestrarre a ogni retry. Mix contiene almeno un uomo e una donna; nessuna ripetizione finché il pool non è esaurito. Donna ha 4 fragranze: il quinto flacone ripete una fragranza, come indicato nel selettore.

Il backend è collegato a Stripe live. Le verifiche di test non hanno completato alcuna transazione né effettuato addebiti. Il problema di fatturazione Fly.io rimane separato.
