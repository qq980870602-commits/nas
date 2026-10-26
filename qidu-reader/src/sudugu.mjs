import {parseDocument} from 'htmlparser2';
import {selectAll,selectOne} from 'css-select';
import {textContent,getInnerHTML} from 'domutils';
import {isSudugu} from './source-types.mjs';

const hosts=new Set(['www.sudugu.org','sudugu.org','www.shudugu.org','shudugu.org','www.suduguu.com','suduguu.com']);
function siteUrl(input,base='https://www.suduguu.com/') {
  const url=new URL(input,base);
  if(!hosts.has(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port)throw new Error('速读谷链接不属于支持的站点');
  url.protocol='https:';url.hostname='www.suduguu.com';url.hash='';return url;
}
function text(doc,selector){const node=selectOne(selector,doc);return node?textContent(node).trim():'';}
function books(doc,base) {
  return selectAll('.item',doc).flatMap(item=>{
    const link=selectOne('h1 a,h3 a,h2 a',item),href=link?.attribs.href;
    if(!href)return [];
    const url=siteUrl(href,base);if(!/^\/\d+\/$/.test(url.pathname))return [];
    const author=selectAll('a,p',item).map(node=>textContent(node).trim()).find(value=>/^作者[：:]/.test(value))||'';
    let coverUrl='';try{const cover=new URL(selectOne('img',item)?.attribs.src,base);if(cover.protocol==='https:')coverUrl=cover.href;}catch{}
    return [{title:textContent(link).trim(),author:author.replace(/^作者[：:]\s*/,''),url:url.href,coverUrl,intro:text(item,'.des'),originName:'速读谷'}];
  });
}
function contentText(node) {
  const html=getInnerHTML(node).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>|<\/(p|div)>/gi,'\n');
  return textContent(parseDocument(html)).replace(/[（(]本章完[）)]/g,'').replace(/\n[ \t]+/g,'\n').trim();
}
export function createSuduguClient({fetcher=(...args)=>fetch(...args),timeout=15000,maxPages=30}={}) {
  async function load(url,operation) {
    const safe=siteUrl(url),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetcher(safe.href,{signal:controller.signal,redirect:'error',credentials:'omit',headers:{Accept:'text/html'}});
      if(!response.ok)throw new Error(operation==='搜索'?`速读谷搜索服务返回 HTTP ${response.status}。请稍后重试，或从发现页、书籍链接进入。`:`速读谷${operation}请求失败 HTTP ${response.status}`);
      const body=await response.text();if(!body.trim())throw new Error('速读谷返回了空页面');
      return parseDocument(body);
    }catch(error){if(controller.signal.aborted)throw new Error('速读谷请求超时，请稍后重试');if(error instanceof TypeError)throw new Error('无法连接速读谷，请检查网络或稍后重试');throw error;}
    finally{clearTimeout(timer);}
  }
  function next(doc,current,kind) {
    const link=selectAll('a',doc).find(node=>textContent(node).replace(/\s/g,'')==='下一页');
    if(!link?.attribs.href)return null;
    const url=siteUrl(link.attribs.href,current),base=siteUrl(current),bookId=base.pathname.split('/')[1];
    if(kind==='目录'&&!new RegExp('^/'+bookId+'/(?:p-\\d+\\.html)?$').test(url.pathname))throw new Error('速读谷目录分页链接异常');
    if(kind==='正文'){
      const id=/^\/(\d+)\/(\d+)(?:-\d+)?\.html$/.exec(base.pathname);
      if(!id||!new RegExp('^/'+id[1]+'/'+id[2]+'(?:-\\d+)?\\.html$').test(url.pathname))throw new Error('速读谷正文分页链接异常');
    }
    return url.href;
  }
  return {
    async search(source,keyword) {
      if(!isSudugu(source))throw new Error('不是支持的速读谷书源');
      if(/^https?:\/\//i.test(keyword.trim())){
        const url=siteUrl(keyword.trim());if(!/^\/\d+\/$/.test(url.pathname))throw new Error('请粘贴速读谷书籍目录链接，例如 https://www.sudugu.org/128/');
        const doc=await load(url.href,'详情'),found=books(doc,url.href);if(!found.length)throw new Error('书籍详情未解析出书名和链接');return [found[0]];
      }
      const url=siteUrl('/i/sor.aspx');url.searchParams.set('key',keyword.trim());
      const found=books(await load(url.href,'搜索'),url.href);
      return [...new Map(found.map(book=>[book.url,book])).values()];
    },
    async catalog(source,book) {
      if(!isSudugu(source))throw new Error('不是支持的速读谷书源');
      let url=siteUrl(book.url).href;const visited=new Set(),chapters=[];
      for(let page=0;url;page++){
        if(page>=maxPages)throw new Error('目录分页超过安全上限，请联系开发者检查此书');
        if(visited.has(url))throw new Error('速读谷目录分页形成循环');visited.add(url);
        const doc=await load(url,'目录');
        for(const link of selectAll('.dir li a',doc)){
          const address=siteUrl(link.attribs.href,url);if(!/^\/\d+\/\d+(?:-\d+)?\.html$/.test(address.pathname))continue;
          chapters.push({title:textContent(link).trim(),url:address.href});
        }
        url=next(doc,url,'目录');
      }
      const unique=[...new Map(chapters.map(chapter=>[chapter.url,chapter])).values()];if(!unique.length)throw new Error('未解析到速读谷目录，页面可能发生变化');return unique;
    },
    async chapterText(source,chapter) {
      if(!isSudugu(source))throw new Error('不是支持的速读谷书源');
      let url=siteUrl(chapter.url).href;const visited=new Set(),parts=[];
      for(let page=0;url;page++){
        if(page>=maxPages)throw new Error('正文分页超过安全上限');if(visited.has(url))throw new Error('速读谷正文分页形成循环');visited.add(url);
        const doc=await load(url,'正文'),node=selectOne('.con',doc);if(!node)throw new Error('未找到速读谷正文，页面可能变化或需要网页验证');
        const content=contentText(node);if(!content)throw new Error('速读谷正文为空');parts.push(content);url=next(doc,url,'正文');
      }
      return parts.join('\n\n');
    },
    async discoveryCategories(source) {
      if(!isSudugu(source))throw new Error('不是支持的速读谷书源');
      const entries=[{title:'推荐榜',url:'https://www.sudugu.org/paihang/',group:'排行榜'},{title:'完本榜',url:'https://www.sudugu.org/wanjie/',group:'排行榜'},{title:'最新更新',url:'https://www.sudugu.org/zuixin/',group:'排行榜'}];
      const doc=await load('https://www.sudugu.org/fenlei/','分类');
      for(const link of selectAll('.fenlei a',doc)) {const url=siteUrl(link.attribs.href);if(/^\/[a-z]+\/$/.test(url.pathname))entries.push({title:textContent(link).replace(/[（(].*$/,'').trim(),url:url.href,group:'小说分类'});}
      return entries;
    },
    async discover(source,entry,page=1) {
      if(!isSudugu(source))throw new Error('不是支持的速读谷书源');if(!Number.isInteger(page)||page<1)throw new Error('页码无效');
      const url=siteUrl(entry.url);if(!/^\/[a-z]+\/$/.test(url.pathname))throw new Error('速读谷发现入口异常');if(page>1)url.pathname+=page+'.html';
      return books(await load(url.href,'推荐'),url.href);
    }
  };
}
export const suduguClient=createSuduguClient();
