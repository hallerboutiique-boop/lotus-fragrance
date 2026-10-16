/* Local, deterministic translations. Observe rendered text so async catalogue,
   validation, legal dialogs and cart updates use the same language too. */
(() => {
 'use strict';
 const languages=[['it','🇮🇹','Italiano'],['en','🇬🇧','English'],['de','🇩🇪','Deutsch'],['fr','🇫🇷','Français'],['es','🇪🇸','Español'],['ar','🇸🇦','العربية']];
 const locales={it:'it-IT',en:'en-GB',de:'de-DE',fr:'fr-FR',es:'es-ES',ar:'ar'};
 let stored;try{stored=localStorage.getItem('lotus-language')}catch{}
 const requested=new URLSearchParams(location.search).get('lang');
 const language=languages.some(l=>l[0]===requested)?requested:languages.some(l=>l[0]===stored)?stored:'it';
 const column=languages.findIndex(l=>l[0]===language);
 const dictionary=new Map(window.LotusTranslations.map(row=>[row[0],row[column]]));
 const patterns=[
  [/^(\d+) profumi$/,['$1 profumi','$1 fragrances','$1 Düfte','$1 parfums','$1 perfumes','$1 عطور']],
  [/^(\d+) varianti$/,['$1 varianti','$1 variants','$1 Varianten','$1 variantes','$1 variantes','$1 خيارات']],
  [/^(\d+) profumi arabi$/,['$1 profumi arabi','$1 Arabian fragrances','$1 arabische Düfte','$1 parfums arabes','$1 perfumes árabes','$1 عطور عربية']],
  [/^(\d+) universi$/,['$1 universi','$1 worlds','$1 Duftwelten','$1 univers','$1 universos','$1 عوالم']],
  [/^1 flacone$/,['1 flacone','1 bottle','1 Flakon','1 flacon','1 frasco','عبوة واحدة']],
  [/^(\d+) flaconi$/,['$1 flaconi','$1 bottles','$1 Flakons','$1 flacons','$1 frascos','$1 عبوات']],
  [/^Fragranza (\d+)$/,['Fragranza $1','Fragrance $1','Duft $1','Fragrance $1','Fragancia $1','العطر $1']],
  [/^Scegli tutte le (\d+) fragranze\.$/,['Scegli tutte le $1 fragranze.','Choose all $1 fragrances.','Wähle alle $1 Düfte.','Choisissez les $1 fragrances.','Elige las $1 fragancias.','اختر العطور وعددها $1.']]
 ];
 function translate(value){
  if(language==='it'||!value)return value;
  const text=value.trim();let translated=dictionary.get(text);
  if(translated===undefined){
   for(const [pattern,values] of patterns){if(pattern.test(text)){translated=text.replace(pattern,values[column]);break}}
  }
  if(translated===undefined&&text.includes(' · '))translated=text.split(' · ').map(part=>translate(part)).join(' · ');
  if(translated===undefined&&text.startsWith('Scopri '))translated=({en:'Discover ',de:'Entdecke ',fr:'Découvrir ',es:'Descubre ',ar:'اكتشف '})[language]+text.slice(7);
  return translated===undefined?value:value.replace(text,translated);
 }
 const money=new Intl.NumberFormat(locales[language],{style:'currency',currency:'EUR'});
 window.LotusI18n=Object.freeze({language,locale:locales[language],translate,money:value=>money.format(value)});
 document.documentElement.lang=language;
 document.documentElement.dir=language==='ar'?'rtl':'ltr';
 try{localStorage.setItem('lotus-language',language)}catch{}
 const attributes=['aria-label','placeholder','label','title'];
 function localize(root){
  if(root.nodeType===Node.TEXT_NODE){
   if(root.parentElement?.closest('script,style,noscript,[data-no-translate],.language-bar'))return;
   const text=translate(root.nodeValue);if(text!==root.nodeValue)root.nodeValue=text;return;
  }
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
  if(root.nodeType===Node.ELEMENT_NODE){
   if(root.matches('script,style,noscript,[data-no-translate],.language-bar'))return;
   attributes.forEach(attribute=>{if(root.hasAttribute(attribute)){const value=root.getAttribute(attribute),next=translate(value);if(value!==next)root.setAttribute(attribute,next)}});
   if(root.matches('meta[name="description"]')){const value=root.content,next=translate(value);if(value!==next)root.content=next}
  }
  [...root.childNodes].forEach(localize);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const bar=document.createElement('div');bar.className='language-bar';bar.dataset.noTranslate='';
  const labels=['Lingua','Language','Sprache','Langue','Idioma','اللغة'];
  const select=document.createElement('select');select.id='site-language';select.setAttribute('aria-label',labels[column]);
  const globe=document.createElement('span');globe.className='language-globe';globe.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M5.6 6.5h12.8M5.6 17.5h12.8"/></svg>';globe.setAttribute('aria-hidden','true');
  for(const [code,flag,name] of languages){const option=new Option(`${flag} ${name}`,code);option.lang=code;option.dir=code==='ar'?'rtl':'ltr';option.selected=code===language;select.add(option)}
  const toggle=document.createElement('button');toggle.type='button';toggle.id='language-toggle';toggle.className='language-toggle';toggle.setAttribute('aria-label',labels[column]);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','language-menu');toggle.append(globe);
  const menu=document.createElement('div');menu.id='language-menu';menu.className='language-menu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label',labels[column]);
  const choose=code=>{try{localStorage.setItem('lotus-language',code)}catch{}const next=new URL(location.href);next.searchParams.set('lang',code);next.hash='';location.assign(next.href)};
  const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false')};
  for(const [code,emoji,name] of languages){const button=document.createElement('button');button.type='button';button.lang=code;button.dir=code==='ar'?'rtl':'ltr';button.textContent=emoji+' '+name;button.setAttribute('aria-pressed',String(code===language));button.onclick=()=>choose(code);menu.append(button)}
  toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))};
  document.addEventListener('click',event=>{if(!bar.contains(event.target))close()});
  bar.addEventListener('keydown',event=>{if(event.key==='Escape'){close();toggle.focus()}if(event.key==='ArrowDown'&&event.target===toggle){event.preventDefault();menu.hidden=false;toggle.setAttribute('aria-expanded','true');menu.querySelector('button').focus()}});
  select.hidden=true;bar.append(toggle,menu,select);
  const header=document.querySelector('.topbar,.product-header');if(header)header.append(bar);else document.body.prepend(bar);
  select.addEventListener('change',()=>choose(select.value));
  localize(document);
  const observer=new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='childList')record.addedNodes.forEach(localize);
    else localize(record.target);
   }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attributes,'content']});
 });
})();
