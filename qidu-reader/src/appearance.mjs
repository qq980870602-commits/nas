export const themePresets=[['海洋蓝','#D9EDF7','#246B9A'],['落日橙','#FCE6DB','#B95D35'],['森林绿','#E3EFDF','#467A54'],['薰衣草','#EEE5F7','#8062A5'],['玫瑰粉','#FAE5ED','#AE527A'],['琥珀金','#F8EED7','#9B782C'],['蒹葭苍苍','#E8F0DF','#648553'],['梦廊','#EBECEE','#667078']];
export const appearanceDefaults={accent:'#2A6A60',appBackground:'#E8F1F1',cardEnabled:true,cardColor:'#FFFFFF',cardOpacity:43,borderColor:'#FFFFFF',borderOpacity:73,borderWidth:1,cardRadius:26,glass:true,glow:60,shelfLayout:'列表',shelfColumns:3,shelfSize:146,showTags:true,tagMode:'彩色',tagColor:'#648553',tabLabels:true,uiFont:false,imageOpacity:30,letterSpacing:0,paragraphGap:12,indent:2,textAlign:'left',marginLeft:26,marginRight:26,marginTop:26,marginBottom:70,underline:false,fontWeight:'400',showStatusBar:true,speechPitch:1,voice:null,followSystem:false,lightBackground:'#F5F0E6',lightInk:'#332F29',darkBackground:'#202623',darkInk:'#CBD4CC'};
const ranges={cardOpacity:[0,100],borderOpacity:[0,100],borderWidth:[0,4],cardRadius:[0,40],glow:[0,100],shelfColumns:[2,6],shelfSize:[90,180],imageOpacity:[0,100],size:[14,36],spacing:[1.2,2.6],letterSpacing:[-1,6],paragraphGap:[0,48],indent:[0,4],marginLeft:[0,60],marginRight:[0,60],marginTop:[0,100],marginBottom:[0,120],speechRate:[.1,3],speechPitch:[.5,2]};
export function cleanTheme(input){
 if(!input||typeof input!=='object')throw new Error('主题数据格式错误');const out={};
 const base={...appearanceDefaults,size:21,spacing:1.85,background:'#F5F0E6',ink:'#332F29'};
 for(const [key,fallback] of Object.entries(base)){
 const value=input[key];if(value===undefined)continue;
 if(ranges[key]){const [min,max]=ranges[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error('主题数值超出范围：'+key);out[key]=value;}
 else if(typeof fallback==='boolean'){if(typeof value==='boolean')out[key]=value;}
 else if(/Color$|Background$|Ink$|^(accent|background|ink)$/.test(key)){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('颜色需要 #RRGGBB 格式');out[key]=value;}
 else if(['shelfLayout','tagMode','fontWeight','textAlign'].includes(key)){const choices={shelfLayout:['列表','网格'],tagMode:['彩色','文字色','自定义'],fontWeight:['400','500','600','700'],textAlign:['left','justify','center']};if(choices[key].includes(value))out[key]=value;}
 }
 return out;
}
export function themeFile(settings){return {format:'qidu-theme',version:1,settings:cleanTheme(settings)};}
export function parseTheme(text){const item=JSON.parse(text.replace(/^\uFEFF/,''));if(item.format!=='qidu-theme'||item.version!==1)throw new Error('请选择栖读主题 JSON 文件');return cleanTheme(item.settings);}
export function rgba(hex,opacity){const v=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#FFFFFF';return 'rgba('+[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)).join(',')+','+Math.max(0,Math.min(1,opacity/100))+')';}
