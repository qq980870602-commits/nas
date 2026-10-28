import {ThemeText as Text} from './Glass.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,StyleSheet,View,TouchableOpacity} from 'react-native';
import {bookInfo,catalog} from './source.mjs';
import {bundledCovers} from './bundled-theme.js';
import {GlassSurface,useAppearance} from './Glass.jsx';
import {formatWordCount} from './book-metadata.mjs';

function Action({children,onPress,disabled,primary=false}){return <GlassSurface disabled={disabled} onPress={onPress} style={[s.action,primary&&{borderColor:'#82B6A6'}]}><Text style={{fontSize:14,color:'#2B6D60',fontWeight:primary?'600':'400'}}>{children}</Text></GlassSurface>;}
export default function BookDetails({book,source=book?.source,onRead,onAdd,onFetched,busy=false,loadInfo=bookInfo,loadCatalog=catalog}){
  const appearance=useAppearance();
  const [details,setDetails]=useState(book),[loading,setLoading]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[imageFailed,setImageFailed]=useState(false);
  const [toc,setToc]=useState(book?.chapters||[]),[tocOpen,setTocOpen]=useState(false),[tocBusy,setTocBusy]=useState(false),[tocError,setTocError]=useState(''),[tocLimit,setTocLimit]=useState(50);
  const fetchedCallback=useRef(onFetched),epoch=useRef(0),tocEpoch=useRef(0);fetchedCallback.current=onFetched;
  const identity=book?.id||book?.url||book?.originUrl||book?.title;
  useEffect(()=>{
    const ticket=++epoch.current;setDetails(book);setError('');setImageFailed(false);setToc(book?.chapters||[]);setTocOpen(false);setTocError('');
    if(!book)return;
    if(!refresh&&book.infoFetchedAt&&Date.now()-book.infoFetchedAt<300000){setLoading(false);return;}
    setLoading(true);
    loadInfo(source,book).then(info=>{if(ticket!==epoch.current)return;setDetails(info);fetchedCallback.current?.(info);}).catch(e=>{if(ticket===epoch.current)setError(e.message);}).finally(()=>{if(ticket===epoch.current)setLoading(false);});
    return()=>{epoch.current++;tocEpoch.current++;};
  },[identity,source?.bookSourceUrl,refresh]);
  if(!book||!details)return null;
  const showToc=async()=>{
    if(tocOpen&&!tocError){setTocOpen(false);return;}setTocOpen(true);if(toc.length)return;
    const ticket=++tocEpoch.current;setTocBusy(true);setTocError('');
    try{const chapters=source?await loadCatalog(source,details):details.chapters||[];if(ticket===tocEpoch.current){setToc(chapters);setTocLimit(50);}}
    catch(e){if(ticket===tocEpoch.current)setTocError(e.message);}finally{if(ticket===tocEpoch.current)setTocBusy(false);}
  };
  const origin=details.originName||details.dahuilang?.source||source?.bookSourceName||'本地导入';
  let host='';try{host=new URL(details.url||details.originUrl||source?.bookSourceUrl).host;}catch{}
  const tags=[formatWordCount(details.wordCount),details.status,details.category].filter(Boolean);
  return <View style={{gap:18,paddingBottom:25}}>
    <GlassSurface contentCard style={s.hero}><View style={s.cover}>{(details.coverUrl&&!imageFailed||appearance.bundledThemeEnabled)?<Image resizeMode='contain' source={appearance.bundledThemeEnabled&&(appearance.forceDefaultCover||!details.coverUrl||imageFailed)?bundledCovers[appearance.defaultCover||0]:{uri:details.coverUrl}} onError={()=>setImageFailed(true)} style={{width:'100%',height:'100%'}} accessibilityLabel={details.title+'封面'}/>:<><Text style={s.leaf}>⸙</Text><Text numberOfLines={4} style={s.coverText}>{details.title}</Text></>}</View><View style={{flex:1,gap:12}}><Text style={s.title}>{details.title}</Text><Text style={s.text}>作者：{details.author||'未提供'}</Text><View style={s.row}>{tags.map((value,index)=><Text key={index} style={s.tag}>{value}</Text>)}</View></View></GlassSurface>
    <View style={s.row}><Action primary disabled={busy} onPress={()=>onRead?.(details,details.id?undefined:0,toc)}>{details.id?'继续阅读':'开始阅读'}</Action>{!details.id&&<Action disabled={busy} onPress={()=>onAdd?.(details)}>＋ 加入书架</Action>}<Action disabled={loading} onPress={()=>setRefresh(value=>value+1)}>↻ 刷新详情</Action></View>
    {loading&&<View style={s.row}><ActivityIndicator color="#35776A"/><Text style={s.text}>正在读取作品信息…</Text></View>}
    {!!error&&<GlassSurface contentCard style={s.card}><Text style={s.error}>详情刷新失败：{error}</Text><Text style={s.caption}>已有书籍和阅读进度会保留，可以重试或继续阅读。</Text></GlassSurface>}
    <GlassSurface contentCard style={s.metrics}>{[['分组',details.group||'未分组'],['类型','文本'],['章节',toc.length?toc.length+' 章':'查看目录']].map(([label,value])=><TouchableOpacity key={label} accessibilityRole={label==='章节'?'button':undefined} disabled={label!=='章节'} onPress={showToc} style={{flex:1,alignItems:'center',gap:8}}><Text style={s.caption}>{label}</Text><Text style={s.text}>{value}</Text></TouchableOpacity>)}</GlassSurface>
    <GlassSurface contentCard style={s.card}><Text style={s.section}>≡ 简介</Text>{!!details.updatedAt&&<Text style={s.text}>更新时间：{details.updatedAt}</Text>}<Text selectable style={s.intro}>{details.intro||(loading?'正在加载简介…':'站点未提供简介，可刷新详情重试。')}</Text>{!!details.latestChapter&&<Text style={s.caption}>最新章节：{details.latestChapter}</Text>}</GlassSurface>
    <GlassSurface contentCard style={s.card}><View style={s.between}><Text style={s.section}>☷ 目录</Text><Action disabled={tocBusy} onPress={showToc}>{tocBusy?'加载中…':tocOpen?'收起目录':'查看目录 ›'}</Action></View><Action disabled={tocBusy} onPress={()=>toc.length?onRead?.(details,0,toc):showToc()}>首章　{details.firstChapter?.title||toc[0]?.title||'点击查看目录'}</Action>{!!tocError&&<Text style={s.error}>{tocError}</Text>}{tocOpen&&<><Text style={s.caption}>共 {toc.length} 章</Text>{toc.slice(0,tocLimit).map((chapter,index)=><Action key={chapter.url||index} disabled={busy} onPress={()=>onRead?.(details,index,toc)}>{chapter.title}　›</Action>)}{tocLimit<toc.length&&<Action onPress={()=>setTocLimit(value=>value+100)}>显示更多章节</Action>}</>}</GlassSurface>
    <GlassSurface contentCard style={s.card}><Text style={s.section}>◎ 来源</Text><Text style={s.text}>{origin}</Text>{!!host&&<Text selectable style={s.caption}>{host}</Text>}</GlassSurface>
  </View>;
}
const s=StyleSheet.create({hero:{padding:20,borderRadius:26,flexDirection:'row',alignItems:'center',gap:18},cover:{width:83,height:118,borderRadius:7,overflow:'hidden',backgroundColor:'#D9E8D8',borderWidth:3,borderColor:'#FFFFFFCC',alignItems:'center',justifyContent:'center'},leaf:{position:'absolute',fontSize:115,color:'#F4FFF0',right:-15,bottom:-10},coverText:{fontSize:16,lineHeight:24,color:'#41685D',padding:8},title:{fontSize:22,lineHeight:31,color:'#25434A',fontWeight:'600'},text:{fontSize:14,lineHeight:24,color:'#3B5D63'},caption:{fontSize:12,lineHeight:21,color:'#698185'},row:{flexDirection:'row',flexWrap:'wrap',gap:9,alignItems:'center'},tag:{paddingHorizontal:10,paddingVertical:5,borderRadius:15,backgroundColor:'#E2EEE5B0',fontSize:11,color:'#50735C'},action:{paddingHorizontal:15,paddingVertical:12,borderRadius:24,alignSelf:'flex-start'},card:{padding:20,borderRadius:26,gap:12},section:{fontSize:17,color:'#2D5159',fontWeight:'500'},intro:{fontSize:16,lineHeight:29,color:'#34565B'},metrics:{flexDirection:'row',padding:20,borderRadius:26},between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},error:{fontSize:13,lineHeight:23,color:'#966244'},toc:{fontSize:14,color:'#41656B',paddingVertical:7,borderBottomWidth:1,borderColor:'#FFFFFF55'}});
