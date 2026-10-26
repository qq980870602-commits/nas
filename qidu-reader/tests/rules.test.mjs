import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRule,importSources,jsonValues,searchAddress,splitChapters} from '../src/rules.mjs';
test('导入单个及批量书源，并保留规则',()=>{const s={bookSourceName:'测试',bookSourceUrl:'https://example.org',ruleContent:{content:'$.body'}};assert.equal(importSources(JSON.stringify(s))[0].ruleContent.content,'$.body');assert.equal(importSources(JSON.stringify([s])).length,1);assert.throws(()=>importSources('{}'));});
test('JS 规则准确提示不兼容',()=>{assert.throws(()=>assertRule('@js:java.getString()'));const s=importSources(JSON.stringify({bookSourceName:'测试',bookSourceUrl:'https://example.org',ruleContent:{content:'@js:result'}}));assert.equal(s[0].warnings.length,1);});
test('聚合书源可使用非网址标识，搜索 JS 与共享库显示兼容提示',()=>{
  const [s]=importSources(JSON.stringify({bookSourceName:'聚合测试',bookSourceUrl:'聚合自定义标识',searchUrl:'<js>example()</js>',jsLib:'example library'}));
  assert.equal(s.bookSourceUrl,'聚合自定义标识');assert.ok(s.warnings.some(x=>x.includes('搜索地址')));assert.ok(s.warnings.some(x=>x.includes('共享 JS')));
  assert.equal(searchAddress({bookSourceUrl:s.bookSourceUrl,searchUrl:'https://example.org/s?q={{key}}'},'a'),'https://example.org/s?q=a');
  assert.throws(()=>searchAddress({bookSourceUrl:s.bookSourceUrl,searchUrl:'/s?q={{key}}'},'a'),/完整/);
});
test('JSONPath 数组、索引、缺失字段',()=>{const d={books:[{name:'甲'},{name:'乙'}]};assert.deepEqual(jsonValues(d,'$.books[*].name'),['甲','乙']);assert.deepEqual(jsonValues(d,'$.books[1].name'),['乙']);assert.deepEqual(jsonValues(d,'$.missing'),[]);assert.throws(()=>jsonValues(d,'$..name'));});
test('搜索关键词编码，页码替换，相对 URL',()=>{assert.equal(searchAddress({bookSourceUrl:'https://example.org',searchUrl:'/s?q={{key}}&p={{page}}'},'山 海',2),'https://example.org/s?q=%E5%B1%B1%20%E6%B5%B7&p=2');assert.throws(()=>searchAddress({searchUrl:'/s, {"method":"POST"}'},'a'));});
test('TXT 章节切分，保留序言和无标题正文',()=>{const c=splitChapters('序言\n第一章 春天\n正文一\n第二章 夏天\n正文二');assert.equal(c.length,3);assert.equal(c[1].title,'第一章 春天');assert.match(c[2].content,/正文二/);assert.equal(splitChapters('普通正文')[0].content,'普通正文\n');});
