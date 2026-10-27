import {parseDocument} from 'htmlparser2';
import {selectAll} from 'css-select';
import {textContent, getInnerHTML} from 'domutils';
import {assertRule, jsonValues, searchAddress} from './rules.mjs';
import {isDahuilang,dahuilangClient} from './dahuilang.mjs';
import {isSudugu} from './source-types.mjs';
import {suduguClient} from './sudugu.mjs';

function context(body) {
  try { return {json: JSON.parse(body)}; } catch { return {html:parseDocument(body)}; }
}
function values(ctx, rule, list = false) {
  if (!rule) return [];
  assertRule(rule);
  if ('json' in ctx) return jsonValues(ctx.json, rule.replace(/^@Json:/i, ''));
  const parts = rule.replace(/^@css:/i, '').split('@');
  const field = parts.length > 1 ? parts.pop() : 'text';
  let nodes = [ctx.html];
  for (let selector of parts) {
    if (!selector) continue;
    let index;
    if (/^(class|id|tag)\./.test(selector)) {
      const match = /^(class|id|tag)\.([\w-]+)(?:\.(-?\d+))?$/.exec(selector);
      if (!match) throw new Error('暂不支持此阅读专用选择器：' + selector);
      selector = ({class:'.',id:'#',tag:''})[match[1]] + match[2];
      if (match[3] !== undefined) index = Number(match[3]);
    }
    nodes = nodes.flatMap(node => {
      const found = selectAll(selector,node);
      if (index === undefined) return found;
      const selected = found.at(index); return selected ? [selected] : [];
    });
  }
  if (list) return nodes.map(html => ({html}));
  return nodes.map(node => field === 'text' ? textContent(node).trim() : field === 'html' ? getInnerHTML(node) : node.attribs?.[field] ?? '');
}
const first = (ctx, rule) => String(values(ctx, rule)[0] ?? '');
async function load(url, source) {
  if (!/^https?:\/\//.test(url)) throw new Error('仅支持 HTTP/HTTPS 地址');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = typeof source.header === 'string' ? JSON.parse(source.header) : source.header ?? {};
    const response = await fetch(url, {headers, signal:controller.signal});
    if (!response.ok) throw new Error('请求失败 HTTP ' + response.status);
    return context(await response.text());
  } finally { clearTimeout(timer); }
}
function rows(ctx, rule) {
  return 'json' in ctx ? values(ctx, rule).flatMap(value=>Array.isArray(value)?value:[value]).map(json => ({json})) : values(ctx, rule, true);
}
function absolute(value, base) { if (!value) throw new Error('书源没有解析出链接'); return new URL(value, base).href; }
export async function bookInfo(source,book) {
  if(!source)return {...book,wordCount:book.wordCount||String((book.chapters||[]).reduce((n,c)=>n+(c.content?.length||0),0)),originName:'本地导入'};
  if(isSudugu(source))return suduguClient.bookInfo(source,book);
  if(isDahuilang(source))return dahuilangClient.bookInfo(source,book);
  const url=book.url||book.originUrl;if(!url||!source.ruleBookInfo)return book;
  const ctx=await load(url,source),r=source.ruleBookInfo,details={...book};
  for(const [key,rule]of Object.entries({title:r.name,author:r.author,intro:r.intro,coverUrl:r.coverUrl,category:r.kind,wordCount:r.wordCount,latestChapter:r.lastChapter}))if(rule){const value=first(ctx,rule);if(value)details[key]=key==='coverUrl'?absolute(value,url):value;}
  return {...details,infoFetchedAt:Date.now()};
}
export async function search(source, keyword) {
  if(isSudugu(source))return suduguClient.search(source,keyword);
  if(isDahuilang(source))return dahuilangClient.search(source,keyword);
  const url = searchAddress(source, keyword); const ctx = await load(url, source); const r = source.ruleSearch;
  if (!r?.bookList || !r.name || !r.bookUrl) throw new Error('缺少搜索列表、书名或书籍链接规则');
  return rows(ctx, r.bookList).map(item => ({title:first(item,r.name), author:first(item,r.author), url:absolute(first(item,r.bookUrl),url)}));
}
export async function catalog(source, book) {
  if(isSudugu(source))return suduguClient.catalog(source,book);
  if(isDahuilang(source))return dahuilangClient.catalog(source,book);
  let url = book.url;
  if (source.ruleBookInfo?.tocUrl) url = absolute(first(await load(url,source), source.ruleBookInfo.tocUrl), url);
  const ctx = await load(url,source); const r = source.ruleToc;
  if (!r?.chapterList || !r.chapterName || !r.chapterUrl) throw new Error('目录规则不完整');
  if (r.nextTocUrl) throw new Error('当前尚不支持分页目录');
  const chapters = rows(ctx,r.chapterList).map(item => ({title:first(item,r.chapterName), url:absolute(first(item,r.chapterUrl),url)}));
  if (!chapters.length) throw new Error('目录为空，请检查规则或登录限制');
  return chapters;
}
export async function chapterText(source, chapter) {
  if(isSudugu(source))return suduguClient.chapterText(source,chapter);
  if(isDahuilang(source))return dahuilangClient.chapterText(source,chapter);
  const r = source.ruleContent;
  if (!r?.content) throw new Error('缺少正文规则');
  if (r.nextContentUrl) throw new Error('当前尚不支持正文分页');
  const content = values(await load(chapter.url, source),r.content).join('\n\n');
  if (!content.trim()) throw new Error('正文为空，请检查书源规则');
  return content;
}

export async function chapterData(source,chapter){if(isDahuilang(source))return dahuilangClient.chapterData(source,chapter);return {content:await chapterText(source,chapter),communityReviews:[],communityLoaded:true};}
export async function communityPageRequest(source,url){if(!isDahuilang(source))throw Error('此书源尚未提供段评接口');return dahuilangClient.communityPage(source,url);}
