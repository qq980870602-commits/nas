import test from 'node:test';import assert from 'node:assert/strict';import {readerDocument} from '../src/reader-document.mjs';import {appearanceDefaults,themeFile,parseTheme} from '../src/appearance.mjs';
test('Hermes 不保留函数源码时仍生成可执行的阅读交互脚本',()=>{
  const original=Function.prototype.toString;
  let html;
  try{
    Function.prototype.toString=function(){return 'function () { [bytecode] }';};
    html=readerDocument({chapterTitle:'测试章节',content:'第一段\n第二段',settings:{flipMode:'平移'}});
  }finally{Function.prototype.toString=original;}
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new Function(script));
  assert.doesNotMatch(script,/\[bytecode\]|\[native code\]/);
  assert.match(script,/window\.qiduCommand=command/);
});
test('阅读文档将书名与正文当作文本，支持简体转换和可执行分页脚本',()=>{const html=readerDocument({title:'</script><script>evil()</script>',chapterTitle:'<标题>',content:'繁體閱讀\n<img src=x onerror=evil()>',settings:{...appearanceDefaults,simplified:true}});assert.ok(html.includes('繁体阅读'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>evil'));const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Function(scripts[0][1]));});
test('新增主题选项往返含屏幕与高亮，拒绝不合法列数与高亮回溯',()=>{const settings={...appearanceDefaults,flipMode:'仿真',speechHighlightLight:'#ABCDEF',brightness:null,volumeKeys:true,highlightPattern:'春风|明月'};const parsed=parseTheme(JSON.stringify(themeFile(settings)));assert.equal(parsed.flipMode,'仿真');assert.equal(parsed.speechHighlightLight,'#ABCDEF');assert.equal(parsed.brightness,null);assert.equal(parsed.volumeKeys,true);assert.equal(parsed.highlightPattern,'春风|明月');assert.throws(()=>themeFile({...settings,shelfColumns:3.5}));assert.throws(()=>themeFile({...settings,highlightPattern:'(a+)+'}));});
