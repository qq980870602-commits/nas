import React,{useState,useEffect,useRef} from 'react';
import {View,Text,Modal,SafeAreaView} from 'react-native';
import * as Font from 'expo-font';
import {loadBundledTheme} from './bundled-theme.js';
import ReaderView from './ReaderView.jsx';
import ParagraphNotes from './ParagraphNotes.jsx';
import {noteKey} from './paragraphs.mjs';
import Home from './Home.jsx';
import {ReaderSettings,AppearanceSettings} from './Customize.jsx';
import {appearanceDefaults} from './appearance.mjs';
import {GlassProvider,AppearanceProvider,GlassSurface} from './Glass.jsx';
import {dayKey} from './stats.mjs';
import {createDahuilangClient} from './dahuilang.mjs';
import {createSuduguClient} from './sudugu.mjs';
import {isSudugu} from './source-types.mjs';

const sample={
  settings:{...appearanceDefaults,prefetch:5,speechRate:1},
  stats:{[dayKey()]:{read:2700,listen:0}},
  sources:[{bookSourceName:'大灰狼聚合5.9.30(vip完全版) · 示例',bookSourceUrl:'大灰狼融合VIP5.0',jsLib:"var host = ['https://preview.example'];",bookSourceGroup:'我的书源',warnings:[]},{bookSourceName:'速读谷 · 示例',bookSourceUrl:'https://www.sudugu.org',bookSourceGroup:'我的书源',warnings:['旧版本缓存的不兼容提示']}],
  books:[
    {id:'1',title:'浮生六记',author:'沈复',index:1,progress:.6,chapters:[{title:'卷一 · 闺房记乐'},{title:'卷二 · 闲情记趣'},{title:'卷三 · 坎坷记愁'},{title:'卷四 · 浪游记快'}],bookmarks:[0]},
    {id:'2',title:'山海经',author:'佚名',index:0,progress:.8,chapters:[{title:'南山经'},{title:'西山经'},{title:'北山经'}],bookmarks:[]},
    {id:'3',title:'夜航船',author:'张岱',index:0,progress:.3,chapters:[{title:'卷一 · 天文部'},{title:'卷二 · 地理部'}],bookmarks:[]}
  ]
};
const dhlPreviewClient=createDahuilangClient({fetcher:async(url)=>{const u=new URL(url);return Response.json(u.pathname==='/discovestyle'?{code:0,data:[{title:'排行榜',url:''},...['推荐榜','新书榜','完本榜'].map(title=>({title,url:'https://preview.example/get_discover?tab=小说&source=番茄&bdtype='+title+'&page={{page}}'}))]}:{code:0,data:u.searchParams.get('page')!=='1'?[]:sample.books.map((b,i)=>({book_id:b.id,book_name:b.title,author:b.author,source:'番茄',tab:'小说',abstract:['在寻常日子里，读到生活的情趣与温柔。','一部充满想象力的古代地理与神话之书。','翻开古人的随身百科，探寻万物的来历。'][i]}))});}});
const suduguPreviewClient=createSuduguClient({fetcher:async(url)=>new Response(new URL(url).pathname==='/fenlei/'?'<div class="fenlei"><a href="/xianxia/">仙侠小说</a></div>':sample.books.map(book=>'<div class="item"><h3><a href="/'+book.id+'/">'+book.title+'</a></h3><p>作者：'+book.author+'</p></div>').join(''))});
const discoveryClient={bookInfo:async(source,book)=>({...book,intro:'这是作品介绍的示例文本。这里展示故事背景、人物与内容概要，方便在开始阅读前了解这本书。',wordCount:'32.8万字',status:'已完结',category:'文学',updatedAt:'1小时前',firstChapter:{title:'第一章 开始',url:book.url},infoFetchedAt:Date.now()}),catalog:async()=>[{title:'第一章 开始',url:'preview:1'},{title:'第二章 故事',url:'preview:2'}],discoveryCategories:(source,options)=>(isSudugu(source)?suduguPreviewClient:dhlPreviewClient).discoveryCategories(source,options),discover:(source,entry,page)=>(isSudugu(source)?suduguPreviewClient:dhlPreviewClient).discover(source,entry,page)};
export default function DesignPreview(){
  const [data,setData]=useState(sample),[tab,setTab]=useState('书架'),[book,setBook]=useState(null);
  const [sourceId,setSourceId]=useState(null),[keyword,setKeyword]=useState(''),[sourceText,setSourceText]=useState(''),[sourceUrl,setSourceUrl]=useState(''),[results,setResults]=useState([]);
  const [fontReady,setFontReady]=useState(null),[noteIndex,setNoteIndex]=useState(null);const reader=useRef(null);
  useEffect(()=>{let active=true;loadBundledTheme().then(async bundled=>{await Font.loadAsync({[bundled.font.name]:bundled.font.uri});if(active){setFontReady(bundled.font.name);setData(value=>({...value,settings:{...value.settings,...bundled.settings,startupEnabled:false}}));}}).catch(()=>{});return()=>{active=false;};},[]);
  const demo=()=>setTab('设置');
  const openPreviewBook=b=>{const chapter={...b.chapters[b.index],content:['夜色落在窗边。街巷渐渐安静下来，她把没读完的书翻到下一页。','纸页轻轻响了一声，像风掠过竹林。白天没有想通的事情，此刻忽然有了新的答案。','“明天再走一段路吧。”她说。','灯光很暖，窗外的月亮也正好。故事还没有结束，前面还有许多值得期待的日子。','她在这一页停留片刻，记下了刚刚想到的那句话。'].join('\n\n')};const value={...b,chapters:b.chapters.map((c,i)=>i===b.index?chapter:c),paragraphNotes:{[noteKey(chapter,0)]:[{id:'demo1',text:'示例批注：留住这一刻的安静。',createdAt:Date.now()},{id:'demo2',text:'示例批注：喜欢这样的开篇。',createdAt:Date.now()}],[noteKey(chapter,2)]:[{id:'demo3',text:'示例批注。',createdAt:Date.now()}]}};setBook(value);};
  const openOnline=(info,source,readNow=true,index=0,chapters)=>{if(!readNow)return;const toc=chapters?.length?chapters:[{title:'第一章 开始',url:'preview:1'},{title:'第二章 故事',url:'preview:2'}];openPreviewBook({...info,id:'preview-online',source,chapters:toc,index:Math.max(0,Math.min(toc.length-1,index)),progress:0});};
  return <GlassProvider><AppearanceProvider settings={{...data.settings,uiFontFamily:fontReady}}><View style={{flex:1}}>{book?<View style={{flex:1,paddingTop:44,paddingBottom:26,backgroundColor:data.settings.background||'#1C1C1E'}}><ReaderView ref={reader} book={book} chapter={book.chapters[book.index]} settings={{size:21,spacing:1.9,...data.settings}} onMenu={()=>setBook(null)} onBubble={index=>setNoteIndex(index)}/><Modal visible={noteIndex!==null} onRequestClose={()=>setNoteIndex(null)}><SafeAreaView style={{flex:1,backgroundColor:'#EFF3E8'}}><GlassSurface onPress={()=>setNoteIndex(null)} style={{padding:14,alignSelf:'flex-end',margin:12}}><Text>完成</Text></GlassSurface><ParagraphNotes book={book} chapter={book.chapters[book.index]} index={noteIndex||0} onUpdate={paragraphNotes=>setBook(value=>({...value,paragraphNotes}))}/></SafeAreaView></Modal></View>:<Home discoveryClient={discoveryClient} fontReady={fontReady} data={data} tab={tab} setTab={setTab} busy={false} openBook={openPreviewBook} removeBook={demo} importBook={demo} sourceId={sourceId} setSourceId={setSourceId} keyword={keyword} setKeyword={setKeyword} results={results} setResults={setResults} sourceText={sourceText} setSourceText={setSourceText} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} importLink={demo} importFile={demo} importText={demo} doSearch={()=>setResults([])} addOnline={openOnline} deleteSource={demo} appearance={<ReaderSettings fontReady={fontReady} settings={{size:21,spacing:1.85,background:'#F5F0E6',ink:'#332F29',...data.settings}} update={settings=>setData(d=>({...d,settings:{...d.settings,...settings}}))} pickImage={demo} fontPanel={<Text>系统字体 · 示例预览</Text>}/>} fontPanel={<Text>字体管理在 App 中导入 TTF / OTF。</Text>} onSpeakRate={speechRate=>setData(d=>({...d,settings:{...d.settings,speechRate}}))} onPrefetch={demo} onClearCache={demo} onBackup={demo} onRestore={demo} onBookmark={setBook} updateSettings={settings=>setData(d=>({...d,settings:{...d.settings,...settings}}))} pickImage={demo} onExportTheme={demo} onImportTheme={demo} pickAppImage={demo} accountPanel={()=>null}/>}<View pointerEvents="none" style={{position:'absolute',top:6,alignSelf:'center',backgroundColor:'#FFFFFF99',paddingHorizontal:12,paddingVertical:4,borderRadius:15}}><Text style={{fontSize:10,color:'#436A6A'}}>界面预览 · 示例数据</Text></View></View></AppearanceProvider></GlassProvider>;
}
