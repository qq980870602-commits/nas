import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryHomeSections} from '../src/discovery-home.mjs';
test('首页优先推荐、完本、新书，不依赖服务器分类顺序',()=>{
  const sections=discoveryHomeSections([{title:'玄幻',url:'a'},{title:'新书榜',url:'b'},{title:'完结榜',url:'c'},{title:'推荐榜',url:'d'}]);
  assert.deepEqual(sections.map(x=>x.title),['推荐榜','完本榜','新书榜']);assert.deepEqual(sections.map(x=>x.entry.url),['d','c','b']);
});
test('缺失榜单不伪造数据，回退到真实入口并去重',()=>{
  assert.deepEqual(discoveryHomeSections([]),[]);
  const entries=[{title:'分类一',url:'a'},{title:'重复',url:'a'},{title:'分类二',url:'b'}];
  assert.deepEqual(discoveryHomeSections(entries).map(x=>x.entry.url),['a','b']);
  assert.equal(discoveryHomeSections([{title:'新书榜',url:'a'}]).length,1);
});
