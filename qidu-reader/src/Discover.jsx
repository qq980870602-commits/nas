import {ThemeText as Text} from './Glass.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Image,Modal,SafeAreaView,ScrollView,StyleSheet,View} from 'react-native';
import {isDahuilang} from './dahuilang.mjs';
import {isSudugu} from './source-types.mjs';
import {discoveryClient} from './discovery-client.mjs';
import {discoveryHomeSections} from './discovery-home.mjs';
import {GlassInput,GlassMaterial,GlassSurface} from './Glass.jsx';
import BookDetails from './BookDetails.jsx';

const Chip=({children,selected,onPress,disabled})=><GlassSurface onPress={onPress} disabled={disabled} style={[s.chip,selected&&{borderColor:'#77AFA1',borderWidth:1.5}]}><Text style={{color:selected?'#205E56':'#526D72',fontSize:13}}>{children}</Text></GlassSurface>;
function Cover({book,large=false}){
  const [failed,setFailed]=useState(false);
  return <View style={[s.cover,large&&s.largeCover]}>{book.coverUrl&&!failed?<Image source={{uri:book.coverUrl}} onError={()=>setFailed(true)} style={{width:'100%',height:'100%'}} accessibilityLabel={book.title+'封面'}/>:<><Text style={s.coverOrnament}>⸙</Text><Text numberOfLines={4} style={[s.coverTitle,large&&{fontSize:18}]}>{book.title}</Text><Text style={s.coverFoot}>众 · 阅</Text></>}</View>;
}
function BookTile({book,onPress,featured=false}){return <GlassSurface onPress={onPress} accessibilityLabel={'查看书籍：'+book.title} style={[s.tile,featured&&s.featureTile]}><Cover book={book} large={featured}/><Text numberOfLines={2} style={s.tileTitle}>{book.title}</Text><Text numberOfLines={featured?2:1} style={s.caption}>{featured?book.intro||book.author:book.author||(book.originName||book.dahuilang?.source||'书源')}</Text></GlassSurface>;}
export default function Discover({sources,onAdd,onSources,busy:appBusy,client=discoveryClient,selectedSourceId}) {
  const supported=sources.filter(item=>isDahuilang(item)||isSudugu(item)),[sourceId,setSourceId]=useState(selectedSourceId||supported[0]?.bookSourceUrl||'');
  const source=supported.find(x=>x.bookSourceUrl===sourceId)||supported[0],server=source?.dahuilang?.server||'';
  const initial=source?.dahuilang?.platform;
  const [platform,setPlatform]=useState(initial&&initial!=='全部'?initial:'番茄'),[draft,setDraft]=useState(initial&&initial!=='全部'?initial:'番茄'),[channel,setChannel]=useState('男频');
  const [categories,setCategories]=useState([]),[sections,setSections]=useState([]),[categoryBusy,setCategoryBusy]=useState(false),[categoryError,setCategoryError]=useState(''),[refresh,setRefresh]=useState(0);
  const [filters,setFilters]=useState(false),[group,setGroup]=useState(''),[entry,setEntry]=useState(null),[detail,setDetail]=useState(null);
  const [books,setBooks]=useState([]),[page,setPage]=useState(0),[more,setMore]=useState(true),[listBusy,setListBusy]=useState(false),[listError,setListError]=useState('');
  const epoch=useRef(0),listEpoch=useRef(0),retryPage=useRef(1);
  const loadSection=async(plan,ticket)=>{
    setSections(previous=>previous.map(section=>section.entry.url===plan.entry.url?{...section,status:'loading',error:''}:section));
    try {const found=await client.discover(source,plan.entry,1);if(ticket!==epoch.current)return;setSections(previous=>previous.map(section=>section.entry.url===plan.entry.url?{...section,status:'ready',books:found}:section));}
    catch(error){if(ticket===epoch.current)setSections(previous=>previous.map(section=>section.entry.url===plan.entry.url?{...section,status:'error',error:error.message}:section));}
  };
  useEffect(()=>{
    const ticket=++epoch.current;++listEpoch.current;setCategories([]);setSections([]);setEntry(null);setDetail(null);setCategoryError('');
    if(!source){setCategoryBusy(false);return;}
    setCategoryBusy(true);
    client.discoveryCategories(source,{platform,channel}).then(items=>{
      if(ticket!==epoch.current)return;
      setCategories(items);setGroup(items[0]?.group||'');
      const plans=discoveryHomeSections(items);setSections(plans.map(plan=>({...plan,status:'loading',books:[],error:''})));
      if(!plans.length)setCategoryError('这个平台暂时没有可用推荐，可切换平台或频道。');
      plans.forEach(plan=>loadSection(plan,ticket));
    }).catch(error=>{if(ticket===epoch.current)setCategoryError(error.message);}).finally(()=>{if(ticket===epoch.current)setCategoryBusy(false);});
    return()=>{epoch.current++;listEpoch.current++;};
  },[source?.bookSourceUrl,server,platform,channel,refresh]);
  const loadBooks=async(targetPage)=>{
    if(!source||!entry)return;const ticket=++listEpoch.current;retryPage.current=targetPage;setListBusy(true);setListError('');
    try {const found=await client.discover(source,entry,targetPage);if(ticket!==listEpoch.current)return;const merged=[...new Map((targetPage===1?found:[...books,...found]).map(book=>[book.url,book])).values()];setBooks(merged);setPage(targetPage);setMore(found.length>0&&(targetPage===1||merged.length>books.length));}
    catch(error){if(ticket===listEpoch.current)setListError(error.message);}
    finally{if(ticket===listEpoch.current)setListBusy(false);}
  };
  useEffect(()=>{setBooks([]);setPage(0);setMore(true);setListError('');setListBusy(false);if(entry)loadBooks(1);return()=>{listEpoch.current++;};},[entry?.url,source?.bookSourceUrl,server]);
  if(!source)return <GlassSurface contentCard style={s.card}><Text style={s.heading}>打开你的推荐书房</Text><Text style={s.text}>导入大灰狼或速读谷后，推荐书籍会直接展示在这里。</Text><Chip onPress={onSources}>添加书源</Chip></GlassSurface>;
  const featured=sections.find(section=>section.title==='推荐榜'&&section.books.length)||sections.find(section=>section.books.length);
  const groups=[...new Set(categories.map(item=>item.group))];
  const openEntry=item=>{setFilters(false);setEntry(item);};
  const closeModal=()=>{if(detail)setDetail(null);else if(entry)setEntry(null);else setFilters(false);};
  return <><View style={s.topline}><Text numberOfLines={1} style={s.sourceName}>{isSudugu(source)?'速读谷':'大灰狼聚合'}</Text><Chip onPress={()=>setRefresh(value=>value+1)} disabled={categoryBusy}>↻</Chip></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.controls}><Chip onPress={()=>onSources(source)}>{isSudugu(source)?'搜索与管理 ›':'线路与账号 ›'}</Chip>{!isSudugu(source)&&<Chip onPress={()=>setFilters(true)}>{platform} · {channel} ⌄</Chip>}<Chip onPress={()=>setFilters(true)}>分类 ⌄</Chip></ScrollView>
  {!!categoryError&&<GlassSurface contentCard style={s.card}><Text style={s.error}>{categoryError}</Text><Chip onPress={()=>setRefresh(value=>value+1)}>点击重试</Chip><Chip onPress={onSources}>书源账号与线路</Chip></GlassSurface>}
  {categoryBusy&&<View style={s.wait}><ActivityIndicator color="#35766B"/><Text style={s.text}>正在打开推荐书房…</Text></View>}
  {!!featured&&<><View style={s.sectionHeader}><Text style={s.heading}>精选推荐</Text><Chip onPress={()=>openEntry(featured.entry)}>查看全部 ›</Chip></View><View style={s.featureRow}>{featured.books.slice(0,2).map(book=><BookTile key={book.url} book={book} featured onPress={()=>setDetail(book)}/>)}</View></>}
  {sections.map(section=><View key={section.entry.url} style={s.section}><View style={s.sectionHeader}><Text style={s.heading}>{section.title}</Text><Chip onPress={()=>openEntry(section.entry)}>查看全部 ›</Chip></View>{section.status==='loading'?<GlassSurface style={s.sectionState}><ActivityIndicator color="#35766B"/><Text style={s.caption}>正在加载…</Text></GlassSurface>:section.status==='error'?<GlassSurface onPress={()=>loadSection(section,epoch.current)} style={s.sectionState} accessibilityLabel={section.title+'加载失败，点击重试'}><Text style={s.error}>↻ 加载失败，点击重试</Text><Text numberOfLines={2} style={s.caption}>{section.error}</Text></GlassSurface>:!section.books.length?<GlassSurface style={s.sectionState}><Text style={s.caption}>这个榜单暂时没有书籍</Text></GlassSurface>:<FlatList horizontal showsHorizontalScrollIndicator={false} data={section.books.slice(0,8)} keyExtractor={book=>book.url} initialNumToRender={4} contentContainerStyle={s.shelf} renderItem={({item})=><BookTile book={item} onPress={()=>setDetail(item)}/>}/>}</View>)}
  <Modal visible={filters||!!entry||!!detail} transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={closeModal}><SafeAreaView style={{flex:1,backgroundColor:'#E3EFEDDD'}}><GlassMaterial radius={0} prominent/><View style={s.modalHeader}><Text numberOfLines={1} style={[s.heading,{flex:1}]}>{detail?'作品详情':entry?entry.title:'分类与筛选'}</Text><Chip onPress={closeModal}>{detail&&entry?'返回榜单':'完成'}</Chip></View><ScrollView contentContainerStyle={{padding:22,paddingBottom:60}}>
  {detail?<BookDetails loadInfo={client.bookInfo} loadCatalog={client.catalog} book={detail} source={source} busy={appBusy} onRead={(info,index,chapters)=>{setDetail(null);setEntry(null);setFilters(false);onAdd(info,source,true,index,chapters);}} onAdd={info=>{setDetail(null);setEntry(null);setFilters(false);onAdd(info,source,false);}}/>:entry?<>{listBusy&&<View style={s.wait}><ActivityIndicator color="#35766B"/><Text style={s.text}>正在加载…</Text></View>}{!!listError&&<GlassSurface contentCard style={s.card}><Text style={s.error}>{listError}</Text><Chip disabled={listBusy} onPress={()=>loadBooks(retryPage.current)}>重试</Chip></GlassSurface>}{books.map(book=><GlassSurface key={book.url} onPress={()=>setDetail(book)} style={s.listBook}><Cover book={book}/><View style={{flex:1,gap:8}}><Text style={s.bookTitle}>{book.title}</Text><Text style={s.caption}>{book.author} · {(book.originName||book.dahuilang?.source||'书源')}</Text><Text numberOfLines={3} style={s.text}>{book.intro}</Text></View></GlassSurface>)}{!listBusy&&!listError&&!books.length&&<Text style={s.text}>这个榜单暂时没有书籍。</Text>}{!!books.length&&<Chip disabled={listBusy||!more} onPress={()=>loadBooks(page+1)}>{more?'加载更多':'已显示全部'}</Chip>}</>:<><Text style={s.text}>筛选后自动更新首页推荐。</Text><View style={s.row}>{supported.map(item=><Chip key={item.bookSourceUrl} selected={source.bookSourceUrl===item.bookSourceUrl} onPress={()=>setSourceId(item.bookSourceUrl)}>{item.bookSourceName}</Chip>)}</View>{!isSudugu(source)&&<><View style={s.row}>{['番茄','七猫','书旗','QQ阅读'].map(value=><Chip key={value} selected={platform===value} onPress={()=>{setPlatform(value);setDraft(value);}}>{value}</Chip>)}</View><GlassInput style={s.input} value={draft} onChangeText={setDraft} placeholder="其他平台名称"/><Chip onPress={()=>setPlatform(draft.trim()==='全部'?'番茄':draft.trim()||'番茄')}>切换平台</Chip><View style={s.row}>{['男频','女频'].map(value=><Chip key={value} selected={channel===value} onPress={()=>setChannel(value)}>{value}</Chip>)}</View></>}<View style={s.row}>{groups.map(value=><Chip key={value} selected={group===value} onPress={()=>setGroup(value)}>{value}</Chip>)}</View><View style={s.row}>{categories.filter(item=>item.group===group).map(item=><Chip key={item.url} onPress={()=>openEntry(item)}>{item.title}</Chip>)}</View></>}
  </ScrollView></SafeAreaView></Modal></>;
}
const s=StyleSheet.create({topline:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},sourceName:{flex:1,fontSize:17,color:'#345F5D',fontWeight:'500'},controls:{gap:8,paddingBottom:18},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:14},card:{padding:20,borderRadius:26,marginBottom:18,gap:12},heading:{fontSize:21,fontWeight:'600',color:'#25434A'},text:{fontSize:13,lineHeight:23,color:'#567177'},caption:{fontSize:12,lineHeight:20,color:'#617A7E'},error:{fontSize:13,lineHeight:22,color:'#8B6247'},chip:{paddingHorizontal:13,paddingVertical:10,borderRadius:22,alignSelf:'flex-start',shadowOpacity:.025},input:{padding:14,borderRadius:20,fontSize:14,marginVertical:12},sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14},featureRow:{flexDirection:'row',gap:12,marginBottom:28},tile:{width:126,borderRadius:24,padding:13,alignItems:'center',gap:10},featureTile:{flex:1,width:undefined,padding:15,minHeight:242},tileTitle:{fontSize:14,lineHeight:21,fontWeight:'500',color:'#29494E',alignSelf:'stretch'},cover:{width:78,height:108,borderRadius:7,overflow:'hidden',backgroundColor:'#D9E8D8',borderWidth:3,borderColor:'#FFFFFFCF',justifyContent:'center',alignItems:'center'},largeCover:{width:106,height:145},coverTitle:{fontSize:14,lineHeight:22,color:'#41685D',padding:8},coverOrnament:{position:'absolute',right:-8,bottom:0,fontSize:105,color:'#FAFFF4A0'},coverFoot:{position:'absolute',bottom:5,fontSize:8,color:'#5A7C65'},shelf:{gap:12,paddingBottom:14,paddingRight:12},section:{marginBottom:25},sectionState:{minHeight:125,alignItems:'center',justifyContent:'center',padding:20,gap:10,borderRadius:24},wait:{padding:22,alignItems:'center',gap:10},modalHeader:{padding:20,flexDirection:'row',alignItems:'center',gap:12},detailCover:{alignItems:'center',gap:16,marginBottom:25},listBook:{padding:18,borderRadius:25,marginBottom:14,flexDirection:'row',gap:16},bookTitle:{fontSize:17,color:'#25434A',fontWeight:'600'}});
