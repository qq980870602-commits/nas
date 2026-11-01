// Measure the real protocol endpoint, never just TCP or an HTML landing page.
export async function rankRoutes(servers,{probe,now=()=>Date.now(),concurrency=3}={}){
 const results=[];let cursor=0;await Promise.all(Array.from({length:Math.min(concurrency,servers.length)},async()=>{while(cursor<servers.length){const server=servers[cursor++],start=now();try{await probe(server);results.push({server,latency:Math.max(0,now()-start),available:true});}catch(e){results.push({server,available:false,error:String(e.message||e)});}}}));return results.sort((a,b)=>Number(b.available)-Number(a.available)||(a.latency??Infinity)-(b.latency??Infinity));
}
export const routeFailure=e=>/超时|无法连接|Failed to fetch|Network request failed|HTTP (404|410|5\d\d)\b|不是 JSON/.test(String(e.message||e));
