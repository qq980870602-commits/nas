import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataPatch,formatWordCount} from '../src/book-metadata.mjs';
test('详情更新只保存元数据，不覆盖章节进度或带入源会话',()=>{
 const existing={id:'saved',index:24,progress:.5,chapters:[{title:'第一章',content:'正文'}]};
 const patch=metadataPatch({title:'作品名',intro:'简介',wordCount:'488万字',status:'连载中',index:0,progress:0,chapters:[],source:{token:'not-for-metadata'},token:'secret'});
 const saved=JSON.parse(JSON.stringify({...existing,...patch}));assert.equal(saved.index,24);assert.equal(saved.progress,.5);assert.equal(saved.chapters.length,1);assert.equal(saved.intro,'简介');assert.equal(saved.token,undefined);assert.equal(saved.source,undefined);
});
test('字数格式兼容原始数字与站点格式',()=>{assert.equal(formatWordCount('4882000'),'488.2万字');assert.equal(formatWordCount('48.8万字'),'48.8万字');assert.equal(formatWordCount(320),'320字');assert.equal(formatWordCount(undefined),'');});
