# Catalogo Lotus Fragrance

Le quattro categorie seguono la selezione del titolare, non una classificazione esclusiva di genere del produttore. Sono presenti 20 referenze e 21 varianti: Hypnotic Poison è distinto in Eau de Toilette ed Eau de Parfum. Y Le Parfum usa il flacone e le note della versione attuale (pino/geranio), non l'edizione 2021 tutta nera.

## Dati commerciali

Modificare `products.json`, oppure usare `catalog-editor.html` per preparare e scaricare un JSON aggiornato. L'editor è locale e non dispone di un backend di pubblicazione. Per rendere le modifiche visibili a tutti, sostituire il JSON nel repository e pubblicare su GitHub Pages.

- `price`: numero in euro, oppure `null`. Nessun prezzo è stato copiato dai produttori.
- `size`: stringa del formato effettivamente venduto, oppure `null`.
- `availability`: `available`, `unavailable`, `preorder`, oppure `null`.
- Il carrello accetta solo prodotti con prezzo positivo, formato confermato e disponibilità `available`.
- Nome, descrizione, note, categoria e immagine sono modificabili nel medesimo file.

## Verifica immagini e note (16 ottobre 2026)

Ogni scheda contiene `source`, il collegamento alla pagina usata per verificare identità e note. Le immagini sono state confrontate visivamente in un provino a contatto prima della pubblicazione. Sono foto dei prodotti, non flaconi generati. La lieve animazione di inclinazione è un effetto applicato alla fotografia, non una ricostruzione 3D del retro del flacone.

- Lattafa: immagini dei singoli prodotti dal catalogo di Lattafa USA (`www.lattafa-usa.com/products.json`); per Oud for Glory usare `badee-al-oud-glory`, NON Honor & Glory. Fakhar Extrait è il flacone dorato, NON Fakhar Black.
- Asdaaf Privé Rose: foto del singolo flacone da Lattafa Albania, `ameerat-al-arab-prive-rose` (seconda immagine); NON la versione rossa Ameerat Al Arab.
- Afnan 9PM: fotografia `9PM-Product-01` da afnan.com; NON 9PM Rebel, Elixir o Pour Femme.
- Dior: packshot delle pagine ufficiali Sauvage Elixir, Hypnotic Poison EDT ed EDP. I due Hypnotic hanno immagini diverse, rispettivamente rosso brillante e rosso scuro.
- Prada: packshot ufficiali Luna Rossa Black e Paradoxe Intense (non Paradoxe originale).
- Yves Saint Laurent: packshot ufficiali Y Le Parfum attuale e Libre Le Parfum (non Libre EDP o Intense).
- Jean Paul Gaultier: immagine editoriale ufficiale del flacone dorato Le Male Elixir, non Le Male Le Parfum né Elixir Absolu.
- Emporio Armani: packshot ufficiale Stronger With You Intensely, non Absolutely o Parfum.
- Carolina Herrera: packshot ufficiale Good Girl Blush Elixir sfumato nero/rosa, non Blush interamente rosa.
- Valentino: packshot ufficiale Donna Born in Roma Eau de Parfum, non Intense, Coral Fantasy o Yellow Dream.

I file WebP sono versioni ridimensionate delle fotografie sorgente. Nessuna dimensione del flacone raffigurato viene presentata come formato disponibile per la vendita.
