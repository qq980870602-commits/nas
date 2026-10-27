import React,{useState} from 'react';
import {View,Text} from 'react-native';
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
  const demo=()=>setTab('设置');
  return <GlassProvider><AppearanceProvider settings={data.settings}><View style={{flex:1}}>{book?<View style={{flex:1,padding:24,backgroundColor:'#E7F0EC',gap:24}}><GlassSurface onPress={()=>setBook(null)} style={{alignSelf:'flex-start',padding:14}}><Text>‹ 返回书架</Text></GlassSurface><Text style={{fontSize:30,color:'#24464B'}}>{book.title}</Text><Text style={{fontSize:19,lineHeight:36,color:'#29464C'}}>风翻过书页，时间慢了下来。{'\n'}在文字里，找到自己的片刻宁静。</Text></View>:<Home discoveryClient={discoveryClient} data={data} tab={tab} setTab={setTab} busy={false} openBook={setBook} removeBook={demo} importBook={demo} sourceId={sourceId} setSourceId={setSourceId} keyword={keyword} setKeyword={setKeyword} results={results} setResults={setResults} sourceText={sourceText} setSourceText={setSourceText} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} importLink={demo} importFile={demo} importText={demo} doSearch={()=>setResults([])} addOnline={demo} deleteSource={demo} appearance={<ReaderSettings settings={{size:21,spacing:1.85,background:'#F5F0E6',ink:'#332F29',...data.settings}} update={settings=>setData(d=>({...d,settings:{...d.settings,...settings}}))} pickImage={demo} fontPanel={<Text>系统字体 · 示例预览</Text>}/>} fontPanel={<Text>字体管理在 App 中导入 TTF / OTF。</Text>} onSpeakRate={speechRate=>setData(d=>({...d,settings:{...d.settings,speechRate}}))} onPrefetch={demo} onClearCache={demo} onBackup={demo} onRestore={demo} onBookmark={setBook} updateSettings={settings=>setData(d=>({...d,settings:{...d.settings,...settings}}))} pickImage={demo} onExportTheme={demo} onImportTheme={demo} pickAppImage={demo} accountPanel={()=>null}/>}<View pointerEvents="none" style={{position:'absolute',top:6,alignSelf:'center',backgroundColor:'#FFFFFF99',paddingHorizontal:12,paddingVertical:4,borderRadius:15}}><Text style={{fontSize:10,color:'#436A6A'}}>界面预览 · 示例数据</Text></View></View></AppearanceProvider></GlassProvider>;
}
