export const metadataKeys=['title','author','intro','coverUrl','category','wordCount','status','updatedAt','latestChapter','firstChapter','originName','url','dahuilang','infoFetchedAt'];
export function metadataPatch(details){return Object.fromEntries(metadataKeys.filter(key=>details[key]!==undefined).map(key=>[key,details[key]]));}
export function formatWordCount(value){
  const text=String(value??'').trim();if(!text)return '';
  if(/^\d+(?:\.\d+)?$/.test(text)){const n=Number(text);return n>=10000?(n/10000).toFixed(1).replace(/\.0$/,'')+'万字':text+'字';}
  return text.endsWith('字')?text:text+'字';
}
