import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),babel=require('@babel/core');
const code=babel.transformSync(fs.readFileSync(new URL('../index.js',import.meta.url),'utf8'),{filename:'index.js',configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;
function startup(load){let Root;const customRequire=id=>{
  if(id==='expo')return {registerRootComponent:component=>{Root=component;}};
  if(id==='react-native')return {Platform:{OS:'android'},View:'div',ScrollView:'div',Text:'p',Pressable:'button'};
  if(id==='./App')return load();
  if(id.includes('DesignPreview'))throw Error('Native build must not load preview');
  return require(id);
};
  vm.runInNewContext(code,{require:customRequire,exports:{},process:{env:{EXPO_PUBLIC_UI_PREVIEW:'1'}}});
  return renderToStaticMarkup(React.createElement(Root));
}
test('原生启动忽略网页预览开关并加载真实应用',()=>{
  const html=startup(()=>({default:()=>React.createElement('p',null,'真实书架')}));
  assert.match(html,/真实书架/);assert.doesNotMatch(html,/启动遇到问题/);
});
test('同步启动模块失败显示错误反馈界面而不是未捕获异常',()=>{
  const html=startup(()=>{throw Error('Native module failed to initialize');});
  assert.match(html,/众阅启动遇到问题/);assert.match(html,/Native module failed to initialize/);assert.match(html,/重试启动/);
});
