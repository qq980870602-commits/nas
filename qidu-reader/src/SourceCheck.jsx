import {validateSource} from './source-check.mjs';
import React,{useRef,useState,useEffect} from 'react';
import {View,Text,Pressable,Switch} from 'react-native';
import {search} from './source.mjs';
export default function SourceCheck({sources,settings,onSettings,onApply}){
 const [status,setStatus]=useState(''),[running,setRunning]=useState(false);const active=useRef(false),seen=useRef(new Set(sources.map(s=>s.bookSourceUrl)));
 const check=async(items)=>{if(active.current||!items.length)return;active.current=true;setRunning(true);const invalid=[],results={};let done=0;for(const source of items){if(!active.current)break;const result=await validateSource(source,search);results[source.bookSourceUrl]={message:result,checkedAt:Date.now()};if(result.startsWith('失效'))invalid.push(source.bookSourceUrl);setStatus('已校验 '+(++done)+'/'+items.length+' · '+source.bookSourceName+'：'+result);}onApply(invalid,results);setStatus('完成 '+done+' 个，移除 '+invalid.length+' 个确认失效书源；其他结果显示在书源卡片中');active.current=false;setRunning(false);};
 useEffect(()=>{const fresh=sources.filter(s=>!seen.current.has(s.bookSourceUrl));seen.current=new Set(sources.map(s=>s.bookSourceUrl));if(settings.autoCheckSources&&fresh.length)check(fresh);},[sources]);
 useEffect(()=>()=>{active.current=false;},[]);
 const button=(label,fn)=><Pressable onPress={fn} style={{padding:12,borderRadius:20,backgroundColor:'#FFFFFF88'}}><Text style={{color:'#376F60'}}>{label}</Text></Pressable>;
 return <View style={{gap:10,marginBottom:18}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}>{button(running?'停止校验':'批量校验',()=>running?active.current=false:check(sources))}<Text style={{flex:1,color:'#567368'}}>导入后自动校验</Text><Switch value={!!settings.autoCheckSources} onValueChange={autoCheckSources=>onSettings({autoCheckSources})}/></View>{!!status&&<Text style={{color:'#567368',lineHeight:22}}>{status}</Text>}<Text style={{fontSize:12,color:'#718478',lineHeight:19}}>连续两次返回 404/410 的搜索接口自动移除并保存恢复备份；超时、需登录、规则不兼容和无结果均保留。</Text>{button('恢复上次清理的书源',()=>{if(running)return;onSettings({autoCheckSources:false});onApply(null,null,true);})}</View>;
}
