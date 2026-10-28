import {parseReviewContent,reviewAddress} from './paragraphs.mjs';
import {parseDocument} from 'htmlparser2';
import {textContent} from 'domutils';

// Native adapter for this specific published protocol; never evaluate source scripts.
export function isDahuilang(source) {
  return source?.bookSourceUrl === '大灰狼融合VIP5.0' && /大灰狼聚合5\.9\.30\(/.test(source.bookSourceName || '') && dahuilangServers(source).length>0;
}
export function dahuilangServers(source) {
  const declaration = /\b(?:var|let|const)\s+host\s*=\s*\[([\s\S]*?)\]/.exec(source.jsLib || '');
  return [...new Set([...(declaration?.[1] || '').matchAll(/['"](https:\/\/[^'"\s]+)['"]/g)].map(m=>{
    try {const u=new URL(m[1]);return !u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null;}catch{return null;}
  }).filter(Boolean))];
}
export function dahuilangConfig(source) {
  if (!isDahuilang(source)) throw new Error('专用适配仅支持大灰狼聚合 5.9.30；其他版本需要重新核对规则');
  const servers=dahuilangServers(source),server=source.dahuilang?.server||servers[0];
  if(!server||!servers.includes(server))throw new Error('请从这份书源声明的 HTTPS 线路中选择服务器');
  return {server,platform:source.dahuilang?.platform?.trim()||'全部'};
}
function plainText(content) {
  return textContent(parseDocument(content.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>|<\/p\s*>|<\/div\s*>/gi,'\n'))).trim();
}
function requireId(value,label) {if(value===undefined||value===null||String(value)==='')throw new Error('书源响应缺少'+label);return String(value);}
function mapBooks(items) {
  return items.filter(x=>x&&x.book_id!==undefined&&x.book_name&&(!x.tab||x.tab==='小说')).map(x=>{
    const metadata={book_id:requireId(x.book_id,'书籍 ID'),source:requireId(x.source,'来源平台'),tab:'小说',url:x.toc_url||''};
    let coverUrl='';try{const url=new URL(x.thumb_url);if(url.protocol==='https:'&&!url.username&&!url.password)coverUrl=url.href;}catch{}
    return {title:String(x.book_name).replace(/（别名：.*?）/g,''),author:String(x.author||''),intro:plainText(String(x.abstract||'')),coverUrl,category:String(x.category||x.tags||''),wordCount:String(x.word_number??''),status:String(x.status||''),updatedAt:String(x.last_chapter_update_time||''),latestChapter:String(x.last_chapter_title||''),url:'dahuilang:'+encodeURIComponent(JSON.stringify(metadata)),dahuilang:metadata};
  });
}
function discoveryAddress(source,input,page=1) {
  if(!Number.isInteger(page)||page<1)throw new Error('页码必须为正整数');
  const {server}=dahuilangConfig(source);
  const url=new URL(String(input).replace(/\{\{page\}\}/g,String(page)),server);
  if(url.origin!==server||url.pathname!=='/get_discover'||url.username||url.password||url.hash||url.searchParams.get('tab')!=='小说')throw new Error('暂不支持此发现入口，仅接受当前线路的小说推荐地址');
  url.searchParams.set('page',String(page));return url;
}
export function createDahuilangClient({fetcher=(...args)=>fetch(...args),sessionProvider=async()=>null,timeout=15000}={}) {
  async function request(source,path,{method='GET',query,body,session,publicRequest=false,allowAnonymous=false,form=false}={}) {
    const {server}=dahuilangConfig(source);
    if(!publicRequest) {
      session=session || await sessionProvider(source);
      if(!session?.token||!session.deviceId) {
        if(!allowAnonymous)throw new Error('请先在“账号与线路”中登录当前大灰狼线路');
        session=null;
      } else {
        if(session.server!==server)throw new Error('请先在“账号与线路”中登录当前大灰狼线路');
        if(/[\r\n;]/.test(session.token+session.deviceId))throw new Error('会话格式无效，请重新登录');
      }
    }
    const url=new URL(path,server);if(query)for(const[k,v]of Object.entries(query))url.searchParams.set(k,String(v));
    const headers={Accept:'application/json'};
    if(session&&!publicRequest)headers.Cookie=`qttoken=${session.token}; deviceId=${session.deviceId}`;
    if(body!==undefined)headers['Content-Type']=form?'application/x-www-form-urlencoded':'application/json';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetcher(url.href,{method,headers,credentials:'omit',redirect:'error',signal:controller.signal,body:body===undefined?undefined:form?new URLSearchParams(body).toString():JSON.stringify(body)});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'登录已失效或当前账号没有访问权限，请在应用中重新登录':'大灰狼请求失败 HTTP '+response.status);
      let result;try{result=JSON.parse(await response.text());}catch{throw new Error('大灰狼线路返回的不是 JSON，可能需要重新登录或更换线路');}
      if(!result||typeof result!=='object')throw new Error('大灰狼响应格式无效');
      if(result.code!==undefined&&Number(result.code)!==0)throw new Error(String(result.msg||'大灰狼拒绝了本次请求'));
      return result;
    } catch(e) {
      if(controller.signal.aborted)throw new Error('大灰狼请求超时，请重试或更换线路后登录');
      if(e instanceof TypeError)throw new Error('无法连接大灰狼线路，请检查网络或更换线路后登录');
      throw e;
    } finally {clearTimeout(timer);}
  }
  return {
    async bookInfo(source,book) {
      let meta=book.dahuilang||book.chapters?.[0]?.dahuilang;
      if(!meta){const url=book.url||book.originUrl||'';if(url.startsWith('dahuilang:')){try{meta=JSON.parse(decodeURIComponent(url.slice(10)));}catch{}}}
      if(!meta?.book_id||!meta.source)throw new Error('旧书籍缺少详情标识，请重新搜索这本书');
      const result=await request(source,'/detail',{method:'POST',allowAnonymous:true,query:{book_id:meta.book_id,source:meta.source,tab:'小说',variable:JSON.stringify({custom:''})},body:{html:''},form:true});
      if(!result.data||Array.isArray(result.data)||typeof result.data!=='object')throw new Error('书籍详情响应不完整');
      const parsed=mapBooks([{...result.data,book_id:result.data.book_id??meta.book_id,book_name:result.data.book_name||book.title,source:result.data.source||meta.source}])[0];
      if(!parsed)throw new Error('书籍详情缺少名称或来源');return {...book,...parsed,infoFetchedAt:Date.now()};
    },
    async login(source,email,password,deviceId) {
      if(!email.trim()||!password||!deviceId)throw new Error('请填写邮箱和密码');
      const result=await request(source,'/login_api',{method:'POST',publicRequest:true,body:{register_email:email.trim(),password}});
      if(typeof result.key!=='string'||!result.key||/[\r\n;]/.test(result.key))throw new Error('登录响应缺少有效会话，请重试');
      return {token:result.key,deviceId,server:dahuilangConfig(source).server};
    },
    async search(source,keyword,page=1) {
      const config=dahuilangConfig(source);
      const result=await request(source,'/search',{allowAnonymous:true,query:{title:keyword,tab:'小说',source:config.platform,page,disabled_sources:'0'}});
      if(!Array.isArray(result.data))throw new Error('搜索响应缺少书籍列表');
      return mapBooks(result.data);
    },
    async discoveryCategories(source,{platform,channel='男频'}={}) {
      platform=platform||dahuilangConfig(source).platform;
      if(platform==='全部')platform='番茄';
      if(!['男频','女频'].includes(channel))throw new Error('请选择男频或女频');
      const result=await request(source,'/discovestyle',{allowAnonymous:true,query:{source:platform,source_type:channel,tab:'小说'}});
      if(!Array.isArray(result.data))throw new Error('发现响应缺少分类列表');
      const seen=new Set();let group='推荐';const entries=[];
      for(const item of result.data) {
        if(!item||typeof item.title!=='string')continue;
        if(!item.url){if(/排行|分类|标签/.test(item.title))group=plainText(item.title).replace(/[°・*.☆]/g,'').trim();continue;}
        try{const url=discoveryAddress(source,item.url);const identity=url.href;if(seen.has(identity))continue;seen.add(identity);entries.push({title:plainText(item.title),url:item.url,group});}catch{}
      }
      return entries;
    },
    async discover(source,entry,page=1) {
      const url=discoveryAddress(source,entry.url,page);
      const result=await request(source,url.pathname,{allowAnonymous:true,query:Object.fromEntries(url.searchParams)});
      if(!Array.isArray(result.data))throw new Error('推荐响应缺少书籍列表');
      return mapBooks(result.data);
    },
    async catalog(source,book) {
      const meta=book.dahuilang;
      if(!meta?.book_id||!meta.source)throw new Error('大灰狼书籍信息不完整，请重新搜索并添加');
      const result=await request(source,'/catalog',{method:'POST',allowAnonymous:true,query:{book_id:meta.book_id,source:meta.source,tab:'小说',variable:JSON.stringify({custom:''})},body:{html:''},form:true});
      if(!Array.isArray(result.data))throw new Error('目录响应缺少章节列表');
      const chapters=result.data.filter(x=>x&&x.source!=='卷'&&x.item_id!==undefined&&x.title).map(x=>{
        const metadata={...meta,item_id:requireId(x.item_id,'章节 ID'),title:String(x.title),source:x.source||meta.source,url:x.toc_url||''};
        return {title:metadata.title,url:'dahuilang:'+encodeURIComponent(JSON.stringify(metadata)),dahuilang:metadata};
      });
      if(!chapters.length)throw new Error('目录为空，可能是访问权限或平台返回异常');
      return chapters;
    },
    async communityPage(source,url){
      const {server}=dahuilangConfig(source);const uri=reviewAddress(url,server);const session=await sessionProvider(source);if(!session?.token||!session.deviceId||session.server!==server)throw Error('请先登录当前大灰狼线路');if(/[\r\n;]/.test(session.token+session.deviceId))throw Error('会话格式无效，请重新登录');return {uri,headers:{Cookie:'qttoken='+session.token+'; deviceId='+session.deviceId}};
    },
    async chapterData(source,chapter){
      const meta=chapter.dahuilang;if(!meta?.item_id||!meta.source)throw Error('章节信息不完整，请重新加载书籍');const result=await request(source,'/content',{method:'POST',query:{review:'1'},body:{html:'',item_id:meta.item_id,source:meta.source,tab:'小说',tone_id:'4',variable:JSON.stringify({custom:''}),version:'4.11.5.1',app:'阅读神评表情',god:true}});if(typeof result.content!=='string'||!result.content.trim())throw Error(String(result.msg||'正文为空，请检查访问权限'));const parsed=parseReviewContent(result.content,dahuilangConfig(source).server,meta);if(!parsed.content)throw Error('本章节没有可显示的正文');return {...parsed,communityVersion:2,communityError:null};
    },
    async chapterText(source,chapter) {
      const meta=chapter.dahuilang;
      if(!meta?.item_id||!meta.source)throw new Error('章节信息不完整，请重新加载书籍');
      const result=await request(source,'/content',{method:'POST',body:{html:'',item_id:meta.item_id,source:meta.source,tab:'小说',tone_id:'4',variable:JSON.stringify({custom:''}),version:'4.11.5.1',app:'栖读',god:false}});
      if(typeof result.content!=='string'||!result.content.trim())throw new Error(String(result.msg||'正文为空，请检查登录及付费权限'));
      const content=plainText(result.content);if(!content)throw new Error('本章节没有可显示的文字正文');return content;
    }
  };
}
let sessionProvider=async()=>null;
export function configureDahuilangSessionProvider(provider) {sessionProvider=provider;}
export const dahuilangClient=createDahuilangClient({sessionProvider:source=>sessionProvider(source)});
