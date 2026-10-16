# Offerte 10 ml e checkout online

Offerte autorizzate: Singolo 1 × 10 ml €14,90; Tris 3 × 10 ml €32,90, automatico sui flaconi scelti; Mystery Box 5 × 10 ml €49,90, estrazione casuale secondo la preferenza Uomo/Donna/Mix. Spedizione inclusa. Il Tris è evidenziato come «Più scelto» su richiesta del titolare, non sulla base di statistiche di vendita.

Il titolare ha confermato disponibili tutti i 9 profumi in formato 10 ml. È stato aggiornato solo `miniature.availability`; nessun prezzo del catalogo è stato cambiato. I prezzi dei pacchetti risiedono in `commerce-core.js` come importi interi in centesimi. Le schede del catalogo mantengono i loro dati commerciali separati; quando il prezzo singolo 10 ml non è valorizzato, mostrano la tariffa Singolo di €14,90 senza modificare i campi prezzo del JSON. Eventuali prezzi già impostati restano prioritari.

## Stato reale

Le offerte e il carrello funzionano. Gli incassi NON sono attivi: `commerce-config.json` ha `checkoutEndpoint: null`. Il pulsante di pagamento resta disabilitato e il motivo è mostrato al cliente. Il precedente avviso Stripe di test, il coupon dimostrativo e il contrassegno non vengono più offerti. Il sito statico GitHub Pages non contiene un backend di pagamento.

## Collegamento a un checkout reale

Occorre un endpoint HTTPS di un backend di fiducia collegato all'account di pagamento live del titolare. Non inserire chiavi segrete nel repository. `POST` riceve `items` con righe scelte `{offerId,fragranceIds}` o Mystery `{offerId:'mystery',gender}`; il client non invia totali autorevoli. Risposta attesa: `{ "url": "https://checkout.stripe.com/..." }`. Sono consentiti solo gli hostname configurati in `checkoutAllowedHosts`.

Prima di attivare l'endpoint il server deve:

- convalidare gli ID delle offerte e l'esatto numero di fragranze per riga, consentendo ripetizioni;
- verificare disponibilità e scorte reali e ricalcolare i prezzi dalle proprie tariffe affidabili;
- applicare spedizione a costo zero, senza introdurre sovrapprezzi non dichiarati;
- creare una sessione di pagamento solo online con metodi configurati dal titolare;
- registrare la lista delle fragranze dell'ordine per la preparazione;
- confermare il pagamento tramite webhook verificato prima di evadere l'ordine, con idempotenza e controlli di sicurezza;
- non fidarsi dei controlli frontend, dei prezzi o della disponibilità salvati nel browser.

Il carrello locale conserva ID delle offerte e delle fragranze, o la preferenza Mystery, non dati di pagamento. Test locali: `node commerce.test.cjs`.

## Aggiornamento offerte: Tris automatico e Mystery Box

Le offerte sono ora all'inizio della home, subito dopo l'hero. Singolo 14,90 €, Tris 32,90 € ogni gruppo di 3 flaconi da 10 ml scelti nel catalogo, Mystery Box 49,90 € per 5 flaconi. Spedizione inclusa. I formati normali restano invariati.

Il carrello anticipa il totale scontato: 3 singoli = 32,90 €, 4 = 47,80 €, 6 = 65,80 €. La Mystery Box non contribuisce alla soglia Tris ed è una riga separata. I pacchetti precedentemente salvati sono conservati.

La richiesta checkout invia le righe scelte con gli ID delle fragranze, oppure `{offerId:'mystery',gender:'men'|'women'|'mix'}`, senza contenuti casuali o prezzi autorevoli dal client. Il futuro backend deve usare `quote` per ricalcolare prezzi e disponibilità e `resolveMystery(gender,catalog,crypto.randomInt)` per assegnare 5 ID realmente disponibili, persistendo l'estrazione nell'ordine con chiave di idempotenza. Non riestrarre a ogni retry. Mix contiene almeno un uomo e una donna; nessuna ripetizione finché il pool non è esaurito. Donna ha 4 fragranze: il quinto flacone ripete una fragranza, come indicato nel selettore.

**Non c'è ancora un endpoint checkout attivo.** L'estrazione è implementata nel modulo riutilizzabile e verificata nei test, ma NON viene simulata come ordine reale nel browser. Non abilitare il pagamento prima di integrare il backend. Il problema di fatturazione Fly.io rimane separato e non è stato modificato.
