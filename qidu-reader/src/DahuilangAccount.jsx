import {ThemeText as Text} from './Glass.jsx';
import React,{useEffect,useState} from 'react';
import {Alert,Platform,StyleSheet,TextInput,TouchableOpacity,View} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import {dahuilangClient,dahuilangConfig,dahuilangServers} from './dahuilang.mjs';
import {GlassSurface,GlassInput} from './Glass.jsx';

export const DAHUILANG_SESSION_KEY='qidu.dahuilang.session.v1';
export async function readDahuilangSession() {
  const saved=await SecureStore.getItemAsync(DAHUILANG_SESSION_KEY);
  if(!saved)return null;
  try {return JSON.parse(saved);}catch{return null;}
}
async function deviceId() {
  if(Platform.OS==='android') {const id=Application.getAndroidId();if(id)return id;}
  if(Platform.OS==='ios') {const id=await Application.getIosIdForVendorAsync();if(id)return id;}
  const key='qidu.device.v1';let id=await SecureStore.getItemAsync(key);
  if(!id){id=Crypto.randomUUID();await SecureStore.setItemAsync(key,id);}return id;
}
const Tap=({children,onPress,disabled})=><GlassSurface disabled={disabled} onPress={onPress} style={[s.tap,disabled&&{opacity:.4}]}><Text style={{color:'#2B6E60'}}>{children}</Text></GlassSurface>;
export default function DahuilangAccount({source,onConfig}) {
  const servers=dahuilangServers(source);
  let config;try{config=dahuilangConfig(source);}catch{config={server:servers[0],platform:'全部'};}
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[platform,setPlatform]=useState(config.platform),[logged,setLogged]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;readDahuilangSession().then(session=>{if(active)setLogged(!!session?.token&&session.server===config.server);}).catch(()=>{if(active)setLogged(false);});return()=>{active=false;};},[config.server]);
  const login=async()=>{
    setBusy(true);
    try {
      const session=await dahuilangClient.login({...source,dahuilang:config},email,password,await deviceId());
      await SecureStore.setItemAsync(DAHUILANG_SESSION_KEY,JSON.stringify(session),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
      onConfig(config);setLogged(true);Alert.alert('登录成功','会话已保存到本机安全存储。搜索和正文访问权限仍由大灰狼服务验证。');
    }catch(e){Alert.alert('登录失败',e.message||'请稍后重试');}finally{setPassword('');setBusy(false);}
  };
  return <GlassSurface style={s.card}><Text style={s.title}>账号与线路 · 大灰狼 5.9.30</Text><Text style={s.detail}>专用适配：小说文字阅读。请在这里自行登录，密码只发送到下方所选线路，不保存在书架或备份中。</Text><Text style={s.label}>当前线路</Text><Text selectable style={s.detail}>{config.server}</Text><View style={s.row}>{servers.map(server=><Tap key={server} disabled={busy} onPress={()=>onConfig({...config,server})}>{config.server===server?'● ':''}{new URL(server).host}</Tap>)}</View><Text style={[s.detail,{color:logged?'#2B6E60':'#7C6545'}]}>{logged?'当前线路已有本机登录会话；有效性待服务验证':'当前线路尚未登录。更换线路后需要重新登录。'}</Text><GlassInput style={s.input} value={email} onChangeText={setEmail} placeholder="大灰狼账号邮箱" placeholderTextColor="#657E81" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!busy}/><GlassInput style={s.input} value={password} onChangeText={setPassword} placeholder="账号密码" placeholderTextColor="#657E81" secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy}/><View style={s.row}><Tap disabled={busy||!email.trim()||!password} onPress={login}>{busy?'正在登录…':'登录所选线路'}</Tap><Tap disabled={busy} onPress={async()=>{try{await SecureStore.deleteItemAsync(DAHUILANG_SESSION_KEY);setLogged(false);}catch(e){Alert.alert('退出失败',e.message);}}}>清除本机登录</Tap></View><Text style={s.label}>搜索来源平台</Text><GlassInput style={s.input} value={platform} onChangeText={setPlatform} placeholder="全部 / 番茄 / 七猫 / 其他平台" placeholderTextColor="#657E81"/><Tap onPress={()=>{onConfig({...config,platform:platform.trim()||'全部'});Alert.alert('已保存','搜索来源：'+(platform.trim()||'全部'));}}>保存平台</Tap><Text style={s.detail}>当前使用云端解析，不支持本地网页验证、漫画、短剧、段评或同步大灰狼云书架。请勿将密码或会话发到聊天中。</Text></GlassSurface>;
}
const s=StyleSheet.create({card:{padding:18,borderRadius:20,backgroundColor:'transparent',marginVertical:18,gap:12},title:{color:'#23434A',fontSize:17},detail:{color:'#536F74',fontSize:13,lineHeight:22},label:{color:'#294A50',fontSize:14,marginTop:8},input:{backgroundColor:'transparent',color:'#203B42',padding:15,borderRadius:12,fontSize:15},row:{flexDirection:'row',flexWrap:'wrap',gap:8},tap:{alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:12,borderRadius:20,backgroundColor:'transparent'}});
