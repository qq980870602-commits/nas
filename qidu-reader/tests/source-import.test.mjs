import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadSourceText} from '../src/source-import.mjs';
const sample = JSON.stringify({bookSourceName:'测试书源',bookSourceUrl:'https://example.org'});
test('链接下载验证 JSON，支持 BOM 并保留规则', async()=>{
  let requested;
  const text=await downloadSourceText(' https://example.org/source.json ',{fetcher:async(url,options)=>{requested=url;assert.match(options.headers.Accept,/json/);return new Response('\uFEFF'+sample);}});
  assert.equal(requested,'https://example.org/source.json');assert.equal(text,sample);
});
test('拒绝错误地址、非书源 JSON、网页和 HTTP 错误',async()=>{
  for(const input of ['not a url','file:///tmp/source.json','https://user:pass@example.org/source.json'])
    await assert.rejects(()=>downloadSourceText(input));
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>new Response('<html>登录</html>')}),/网页/);
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>new Response('{}')}),/缺少/);
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>new Response('not json')}),/有效/);
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>new Response('',{status:403})}),/403/);
});
test('下载断网、超时、超大文件有明确错误',async()=>{
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>{throw new TypeError('fetch failed');}}),/无法连接/);
  await assert.rejects(()=>downloadSourceText('https://example.org',{timeout:5,fetcher:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))}),/超时/);
  await assert.rejects(()=>downloadSourceText('https://example.org',{fetcher:async()=>new Response(sample,{headers:{'content-length':String(5*1024*1024)}})}),/4 MB/);
});
