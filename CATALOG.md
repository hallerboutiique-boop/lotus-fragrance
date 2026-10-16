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

Ogni scheda contiene `source`, il collegamento alla pagina usata per verificare identità e note. Le immagini sono state confrontate visivamente in un provino a contatto prima della pubblicazione. Sono foto dei prodotti, non flaconi generati. I flaconi restano fermi e la vetrina cambia prodotto solo con i controlli manuali.

- Lattafa: immagini dei singoli prodotti dal catalogo di Lattafa USA (`www.lattafa-usa.com/products.json`); per Oud for Glory usare `badee-al-oud-glory`, NON Honor & Glory. Fakhar Extrait è il flacone dorato, NON Fakhar Black.
- Asdaaf Privé Rose: foto del singolo flacone da Lattafa Albania, `ameerat-al-arab-prive-rose` (seconda immagine); NON la versione rossa Ameerat Al Arab.
- Afnan 9PM: fotografia `9PM-Product-01` da afnan.com; NON 9PM Rebel, Elixir o Pour Femme.

I file WebP in `assets/products/` sono versioni ridimensionate delle fotografie sorgente. Le versioni in `assets/products/studio/` sono rielaborazioni imagegen delle stesse foto, con fondo nero e luce da studio: l'identità del prodotto viene controllata prima della pubblicazione. Le fotografie sorgente restano conservate. Nessuna dimensione del flacone raffigurato viene presentata come formato disponibile per la vendita.
