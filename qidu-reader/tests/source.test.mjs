import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {search,catalog,chapterText} from '../src/source.mjs';
test('CSS 书源完整搜索、目录、正文流程',async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url.startsWith('/search')?'<div class="book"><a href="/book">测试书</a><span>作者甲</span></div>':req.url==='/book'?'<a class="toc" href="/toc">目录</a>':req.url==='/toc'?'<div class="chapter"><a href="/chapter">第一章</a></div>':'<div id="content"><p>测试段落一。</p><p>测试段落二。</p></div>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {const source={bookSourceUrl:base,searchUrl:'/search?q={{key}}',ruleSearch:{bookList:'.book',name:'a@text',author:'span@text',bookUrl:'a@href'},ruleBookInfo:{tocUrl:'.toc@href'},ruleToc:{chapterList:'.chapter',chapterName:'a@text',chapterUrl:'a@href'},ruleContent:{content:'#content p@text'}};
    const books=await search(source,'测试');assert.equal(books[0].title,'测试书');assert.equal(books[0].url,base+'/book');
    const chapters=await catalog(source,books[0]);assert.equal(chapters[0].title,'第一章');assert.equal(await chapterText(source,chapters[0]),'测试段落一。\n\n测试段落二。');
    const legacy={...source,ruleSearch:{bookList:'class.book',name:'tag.a.0@text',author:'tag.span@text',bookUrl:'tag.a.0@href'}};
    assert.equal((await search(legacy,'测试'))[0].title,'测试书');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('JSON 书源完整流程及分页拒绝',async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.startsWith('/s?')?{books:[{name:'JSON书',url:'/b'}]}:req.url==='/b'?{chapters:[{name:'第一节',url:'/c'}]}:{body:'JSON 正文'}));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {const source={bookSourceUrl:base,searchUrl:'/s?q={{key}}',ruleSearch:{bookList:'$.books',name:'$.name',bookUrl:'$.url'},ruleToc:{chapterList:'$.chapters',chapterName:'$.name',chapterUrl:'$.url'},ruleContent:{content:'$.body'}};
    const books=await search(source,'测试');assert.equal(books[0].title,'JSON书');const chapters=await catalog(source,books[0]);assert.equal(await chapterText(source,chapters[0]),'JSON 正文');
    await assert.rejects(()=>chapterText({...source,ruleContent:{content:'$.body',nextContentUrl:'$.next'}},chapters[0]),/分页/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
