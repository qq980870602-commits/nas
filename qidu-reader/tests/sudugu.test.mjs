import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuduguClient} from '../src/sudugu.mjs';
import {importSources} from '../src/rules.mjs';
import {isSudugu} from '../src/source-types.mjs';
const source={bookSourceName:'速读谷',bookSourceUrl:'https://www.sudugu.org'};
const item='<div class="item"><a href="/128/"><img src="https://images.example/cover.jpg"></a><h3><a href="/128/">测试书</a></h3><p><a href="/128/">作者：测试作者</a></p></div>';
test('旧速读谷书源中的 JS、组合规则不会再触发通用不兼容提示',()=>{
 const imported=importSources(JSON.stringify({...source,ruleContent:{replaceRegex:'##pattern'},exploreUrl:'@js:code'}));assert.deepEqual(imported[0].warnings,[]);
 assert.equal(isSudugu({...source,bookSourceUrl:'https://www.sudugu.org.evil.example'}),false);
});
test('搜索映射与书籍链接入口，不执行原书源脚本',async()=>{
 const calls=[];const client=createSuduguClient({fetcher:async url=>{calls.push(url);return new Response(item);}});
 const books=await client.search(source,'测试 作者');assert.equal(books[0].title,'测试书');assert.equal(books[0].author,'测试作者');assert.equal(books[0].originName,'速读谷');assert.equal(new URL(calls[0]).searchParams.get('key'),'测试 作者');
 assert.equal((await client.search(source,'https://www.sudugu.org/128/'))[0].url,'https://www.suduguu.com/128/');
 await assert.rejects(()=>client.search(source,'https://evil.example/128/'),/支持的站点/);
});
test('目录合并分页、去重并保留章节顺序',async()=>{
 const pages={'/128/':'<div class="dir"><li><a href="/128/1.html">第一章</a></li></div><a href="p-2.html#dir">下一页</a>','/128/p-2.html':'<div class="dir"><li><a href="/128/1.html">第一章</a></li><li><a href="/128/2.html">第二章</a></li></div>'};
 const client=createSuduguClient({fetcher:async url=>new Response(pages[new URL(url).pathname])});const chapters=await client.catalog(source,{url:'https://www.sudugu.org/128/'});assert.deepEqual(chapters.map(x=>x.title),['第一章','第二章']);
});
test('正文合并同章分页，不跳到下一章，移除脚本与章节尾标',async()=>{
 const calls=[];const client=createSuduguClient({fetcher:async url=>{calls.push(url);return new Response(new URL(url).pathname.endsWith('-2.html')?'<div class="con">第二段（本章完）</div><a href="2.html">下一章</a>':'<div class="con">第一段<br>换行<script>not text</script></div><a href="1-2.html">下一页</a>');}});
 assert.equal(await client.chapterText(source,{url:'https://www.sudugu.org/128/1.html'}),'第一段\n换行\n\n第二段');assert.equal(calls.length,2);
});
test('分页循环、越站链接与页面上限均明确报错',async()=>{
 const loop=createSuduguClient({fetcher:async()=>new Response('<div class="dir"></div><a href="/128/">下一页</a>')});await assert.rejects(()=>loop.catalog(source,{url:'https://www.sudugu.org/128/'}),/循环/);
 const external=createSuduguClient({fetcher:async()=>new Response('<div class="con">内容</div><a href="https://evil.example/128/1-2.html">下一页</a>')});await assert.rejects(()=>external.chapterText(source,{url:'https://www.sudugu.org/128/1.html'}),/支持的站点/);
 const limit=createSuduguClient({maxPages:1,fetcher:async()=>new Response('<div class="con">内容</div><a href="1-2.html">下一页</a>')});await assert.rejects(()=>limit.chapterText(source,{url:'https://www.sudugu.org/128/1.html'}),/安全上限/);
});
test('站点 HTTP 500 不误报成解析成功或 JS 问题',async()=>{
 const client=createSuduguClient({fetcher:async()=>new Response('server error',{status:500})});await assert.rejects(()=>client.search(source,'测试'),/搜索服务返回 HTTP 500/);
});
