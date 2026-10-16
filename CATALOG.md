# Catalogo Lotus Fragrance

Il catalogo contiene solo i 10 profumi arabi richiesti: cinque nella categoria uomo e cinque nella categoria donna. Le due categorie seguono la selezione del titolare; alcuni produttori presentano le relative fragranze come unisex. Le referenze europee sono state rimosse dal catalogo e dalla vetrina.

## Dati commerciali

Modificare `products.json`, oppure usare `catalog-editor.html` per preparare e scaricare un JSON aggiornato. L'editor è locale e non dispone di un backend di pubblicazione. Per rendere le modifiche visibili a tutti, sostituire il JSON nel repository e pubblicare su GitHub Pages.

- `price`: numero in euro, oppure `null`. Nessun prezzo è stato copiato dai produttori.
- `size`: stringa del formato effettivamente venduto, oppure `null`.
- `availability`: `available`, `unavailable`, `preorder`, oppure `null`.
- Il carrello accetta solo prodotti con prezzo positivo, formato confermato e disponibilità `available`.
- Nome, descrizione, note, categoria e immagine sono modificabili nel medesimo file.

## Verifica immagini e note (16 ottobre 2026)

Ogni scheda contiene `source`, il collegamento alla pagina usata per verificare identità e note. Le foto sorgente sono state confrontate visivamente prima della rielaborazione. Le immagini pubblicate sono composizioni imagegen basate sui flaconi originali, con luce da dietro e miniature concettuali da 10 ml. Le miniature non sono fotografie né confezioni ufficiali verificate: questa distinzione è indicata sul sito e nelle schede. I flaconi restano fermi e la vetrina cambia prodotto solo con i controlli manuali.

- Lattafa: immagini dei singoli prodotti dal catalogo di Lattafa USA (`www.lattafa-usa.com/products.json`); per Oud for Glory usare `badee-al-oud-glory`, NON Honor & Glory. Fakhar Extrait è il flacone dorato, NON Fakhar Black.
- Asdaaf Privé Rose: foto del singolo flacone da Lattafa Albania, `ameerat-al-arab-prive-rose` (seconda immagine); NON la versione rossa Ameerat Al Arab.
- Afnan 9PM: fotografia `9PM-Product-01` da afnan.com; NON 9PM Rebel, Elixir o Pour Femme.

I file WebP in `assets/products/` sono versioni ridimensionate delle fotografie sorgente. Le versioni in `assets/products/studio/` sono rielaborazioni imagegen delle stesse foto, con fondo nero e luce da studio: l'identità del prodotto viene controllata prima della pubblicazione. Le fotografie sorgente restano conservate. Nessuna dimensione del flacone raffigurato viene presentata come formato disponibile per la vendita.

## Controluce e miniature 10 ml

Correzione di scala: le miniature sono ridotte uniformemente, tappo incluso, a circa il 43–45% dell'altezza del flacone grande, mantenendo il rapporto larghezza/altezza e il piano d'appoggio comune. Non vengono trattate come confezioni reali misurate.

Le versioni definitive senza riflessi sul pavimento, con base nera opaca e solo controluce dietro i flaconi, sono in `assets/products/matte-mini/`. La luce è scelta in base al flacone: oro/champagne per Asad, Oud for Glory, Fakhar Extrait e Nebras; bianco freddo per 9PM; ambra per Khamrah Qahwa e Yara Tous; rosa per Yara e Privé Rose; avorio per Eclaire. Le miniature sono ricostruzioni nello stile del grande, non atomizzatori generici. I dati `miniature.price`, `miniature.size` e `miniature.availability` si modificano in `products.json` o nell'editor locale, che include anche le righe 10 ml; prezzo e disponibilità restano null e la vendita delle miniature non è attivata.

Ricerca online: trovati soprattutto travasi indipendenti, non miniature ufficiali corrispondenti da 10 ml. Non scambiare roll-on, oli, formati 5 ml o 12 ml per EDP originali da 10 ml.

- [Lattafa: gift set con formato 12 ml, non 10 ml](https://lattafa.com/shop/page/10/?filter_product_category=fragrances).
- [Lattafa sample service 2/5/10 ml](https://pureoud.nl/products/lattafa-sample-service-2-5-10ml?variant=51983601795401).
- [Afnan 9PM: decant, non confezione originale](https://www.parfumsplit.com/product-page/afnan-9pm).
- [Fakhar Extrait: campioni travasati, non confezione autorizzata](https://www.tryoutyourscent.com/products/fakhar-extrait).
- [Privé Rose: decant indipendente](https://perfumeza.it/product/asdaaf-ameerat-al-arab-prive-rose-eau-de-parfum-for-women-10ml).
- [Eclaire: campioni travasati](https://www.scentley.co.uk/products/eclaire-lattafa-sample).
- [Nebras: decant indipendente](https://minisprays.com/products/lattafa-nebras-eau-de-parfum).
