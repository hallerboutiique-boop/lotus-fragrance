(function(root){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 function distance(a,b){
  const rows=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=0;j<=b.length;j++)rows[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1)}
  return rows[a.length][b.length];
 }
 function search(catalog,query,translate=value=>value){
  const q=normalize(String(query).slice(0,120));if(!q)return [...catalog];
  const tokens=q.split(' ').slice(0,10);
  return catalog.map(product=>{
   const name=normalize(product.name),notes=[...(product.notes||[]),...(product.notes||[]).map(translate)];
   const category=product.category==='arabi-uomo'?'uomo uomo men man herren homme hombre رجال للرجال':'donna women woman damen femme mujer نساء للنساء';
   const text=normalize([product.name,product.brand,...notes,category].join(' ')),words=text.split(' ');
   let score=name.includes(q)?100:0;
   for(const token of tokens){
    if(words.includes(token))score+=20;
    else if(words.some(word=>word.startsWith(token)))score+=12;
    else if(token.length>=3&&words.some(word=>Math.abs(word.length-token.length)<=2&&distance(token,word)<=(token.length>5?2:1)))score+=5;
    else return {product,score:0};
   }
   return {product,score};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.product.name.localeCompare(b.product.name)).map(row=>row.product);
 }
 const api=Object.freeze({normalize,search});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LotusSearch=api;
})(typeof window!=='undefined'?window:globalThis);
