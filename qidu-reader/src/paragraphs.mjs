import {parseDocument} from 'htmlparser2';import {textContent,findAll,getOuterHTML} from 'domutils';
const paths=new Set(['/fanqie_comment','/qimao_comment','/get_para_review']);
export function reviewAddress(input,server,meta={}){let url;try{url=new URL(String(input),server);}catch{throw Error('段评地址无效');}if(url.origin!==server||url.protocol!=='https:'||url.username||url.password||!paths.has(url.pathname)||url.hash)throw Error('段评只允许当前书源线路的受支持页面');if(url.pathname==='/qimao_comment'&&url.searchParams.get('mode')==='paragraph'){url.pathname='/get_para_review';url.searchParams.delete('mode');if(url.searchParams.has('paragraph_id')){url.searchParams.set('para',url.searchParams.get('paragraph_id'));url.searchParams.delete('paragraph_id');}}for(const key of ['book_id','item_id','source'])if(!url.searchParams.get(key)&&meta[key])url.searchParams.set(key,String(meta[key]));return url.href;}
const plain=html=>textContent(parseDocument(String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>|<\/p\s*>|<\/div\s*>/gi,'\n'),{recognizeSelfClosing:true})).trim();
export function parseReviewContent(html,server,meta={}){
 const doc=parseDocument(String(html),{recognizeSelfClosing:true}),paragraphs=[],communityReviews=[],tokens=[];
 const blocks=new Set(['p','div']);
 function walk(nodes){for(const node of nodes){if(node.type==='script'||node.type==='style'||node.type==='tag'&&['script','style','img'].includes(node.name))continue;
  if(node.type==='tag'&&blocks.has(node.name)&&!findAll(n=>n.type==='tag'&&blocks.has(n.name),node.children||[]).length){tokens.push({block:node});continue;}
  if(node.type==='tag'&&node.name==='comment'){tokens.push({comment:node});continue;}
  if(node.type==='text'){if(node.data.trim())tokens.push({text:node.data});continue;}if(node.children)walk(node.children);
 }}
 const append=text=>{for(const line of plain(text).split(/\r?\n+/).map(x=>x.trim()).filter(Boolean))paragraphs.push(line);};
 const attach=node=>{if(!node?.attribs?.ident||!paragraphs.length)return;try{const match=/^(\d+(?:\.\d+)?)(万|[kw])?\+?$/i.exec(String(node.attribs.count||'0').trim());if(!match)return;const count=Math.min(10000000,Math.floor(Number(match[1])*(match[2]?.toLowerCase()==='k'?1000:match[2]?10000:1)));const index=paragraphs.length-1;communityReviews.push({index,count,url:reviewAddress(node.attribs.ident,server,meta),platform:meta.source||''});}catch{}};
 walk(doc.children);for(const token of tokens){if(token.block){append(getOuterHTML(token.block));attach(findAll(n=>n.type==='tag'&&n.name==='comment',[token.block])[0]);}else if(token.comment)attach(token.comment);else append(token.text);}
 return {content:paragraphs.join('\n\n'),communityReviews,communityLoaded:true};
}
export function rawParagraphs(content){return String(content||'').replace(/^\uFEFF/,'').split(/\r?\n+/).filter(x=>x.trim()).map(x=>x.trim());}
export function noteKey(chapter,index){const raw=rawParagraphs(chapter.content)[index]||'';let hash=2166136261;for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);return 'note-'+encodeURIComponent(chapter.url||chapter.title||'local')+'-'+index+'-'+(hash>>>0).toString(16);}
export function localNotes(book,chapter,index){const items=book.paragraphNotes?.[noteKey(chapter,index)];return Array.isArray(items)?items.filter(x=>x&&typeof x.text==='string'&&typeof x.id==='string'):[];}
export function bubbleCounts(book,chapter){return Object.fromEntries(rawParagraphs(chapter.content).map((_,index)=>{const remote=(Array.isArray(chapter.communityReviews)?chapter.communityReviews:[]).find(x=>x.index===index);return [index,{local:localNotes(book,chapter,index).length,community:remote?.count||0,sourceAvailable:!!remote?.url}];}));}
