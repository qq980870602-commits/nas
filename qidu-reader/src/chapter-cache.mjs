import {cacheLimit} from './reading-policy.mjs';
export const COMMUNITY_VERSION=2;
export function needsReviews(book,chapter){return /大灰狼/.test(book.source?.bookSourceName||'')&&(chapter.communityVersion!==COMMUNITY_VERSION||chapter.communityLoaded===false||chapter.cacheSourceOrigin!==(book.source?.dahuilang?.server||''));}
export function createChapterCache({getBook,patchChapter,fetchChapter,onStatus=()=>{}}){
  const inFlight=new Map();let epoch=0,revision=0;
  const key=(book,index)=>[revision,book.id,book.source?.dahuilang?.server||'',book.chapters[index]?.url||index].join('|');
  async function ensure(bookId,index,{force=false}={}){
    const book=getBook(bookId),chapter=book?.chapters[index];if(!book?.source||!chapter)return chapter;
    if(!force&&chapter.content&&!needsReviews(book,chapter))return chapter;
    const id=key(book,index);if(inFlight.has(id))return inFlight.get(id);
    const task=(async()=>{const payload={...await fetchChapter(book,chapter),cacheSourceOrigin:book.source?.dahuilang?.server||''};if(!payload?.content)throw Error('章节正文为空');const current=getBook(bookId);if(current?.chapters[index]&&key(current,index)===id)patchChapter(bookId,index,payload);return {...chapter,...payload};})();
    inFlight.set(id,task);try{return await task;}finally{if(inFlight.get(id)===task)inFlight.delete(id);}
  }
  async function prefetch(bookId,index,count){
    const ticket=++epoch,book=getBook(bookId),limit=cacheLimit(count),end=Math.min(book?.chapters.length||0,index+1+limit);let next=index+1,done=0,failed=false,lastError='';
    const total=Math.max(0,end-next);const report=extra=>onStatus({bookId,done,total,error:lastError,loading:ticket===epoch&&!failed&&done<total,...extra});report();
    await Promise.all(Array.from({length:Math.min(2,total)},async()=>{while(ticket===epoch&&!failed&&next<end){const target=next++;try{await ensure(bookId,target);if(ticket!==epoch)return;done++;report();}catch(error){if(ticket===epoch){failed=true;lastError=error.message;report({loading:false});}return;}}}));
    if(ticket===epoch)report({loading:false});return {done,total,cancelled:ticket!==epoch};
  }
  function cancel(){epoch++;onStatus({loading:false,done:0,total:0});}
  return {ensure,prefetch,cancel,invalidate(){revision++;inFlight.clear();cancel();}};
}
