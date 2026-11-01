export async function validateSource(source,search){
 let result='';
 for(let attempt=0;attempt<2;attempt++){
  try{const books=await search(source,'斗罗大陆');return books.length?'可用':'待确认：搜索无结果';}
  catch(e){const message=String(e.message||e);result=/HTTP\s*(404|410)\b/.test(message)?'失效：搜索接口已移除':'待确认：'+message;if(!result.startsWith('失效'))return result;}
 }
 return result;
}
