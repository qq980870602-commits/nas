import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, SafeAreaView, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { dayKey, recentDays, streak } from './stats.mjs';
import { isDahuilang } from './dahuilang.mjs';
import {isSudugu} from './source-types.mjs';
import Discover from './Discover.jsx';
import { GlassSurface, GlassInput, GlassTabs, GlassMaterial } from './Glass.jsx';
const green = '#2A6A60';
const duration = seconds => seconds > 0 && seconds < 60 ? `${Math.floor(seconds)}秒` : seconds >= 3600 ? `${Math.floor(seconds / 3600)}时${Math.floor(seconds % 3600 / 60)}分` : `${Math.floor(seconds / 60)}分钟`;
function Action({
  children,
  onPress,
  disabled
}) {
  return <GlassSurface disabled={disabled} onPress={onPress} style={[u.action, disabled && {
    opacity: .4
  }]}><Text style={{
      color: green,
      fontSize: 14
    }}>{children}</Text></GlassSurface>;
}
function Row({
  icon,
  title,
  detail,
  onPress
}) {
  return <TouchableOpacity style={u.settingRow} onPress={onPress}><Text style={u.rowIcon}>{icon}</Text><Text style={u.rowTitle}>{title}</Text><Text style={u.rowDetail}>{detail}</Text><Text style={u.chevron}>›</Text></TouchableOpacity>;
}
function Bars({
  days
}) {
  const max = Math.max(60, ...days.map(d => d.read + d.listen));
  return <View style={u.bars}>{days.map(d => <View key={d.key} style={u.barColumn}><View style={{
        height: 110,
        width: '100%',
        justifyContent: 'flex-end'
      }}><LinearGradient colors={['#B88E50', '#238DF2']} style={{
          height: Math.max(2, (d.read + d.listen) / max * 110),
          borderRadius: 4
        }} /></View>{days.length <= 7 && <Text style={u.axis}>{d.label}</Text>}</View>)}</View>;
}
function Statistics({
  stats
}) {
  const today = stats[dayKey()] || {
      read: 0,
      listen: 0
    },
    week = recentDays(stats),
    total = week.reduce((n, d) => n + d.read + d.listen, 0);
  return <><GlassSurface style={u.statsCard}><View style={u.ring}><Text style={u.total}>{duration(today.read + today.listen)}</Text><Text style={u.secondary}>今日合计</Text></View><View style={u.blueLine} /><Text style={[u.secondary, {
        textAlign: 'center',
        marginVertical: 16
      }]}>● 阅读 {duration(today.read)}　● 听书 {duration(today.listen)}</Text><View style={u.metrics}>{[['▤', duration(today.read), '阅读'], ['♬', duration(today.listen), '听书'], ['♨', `${streak(stats)}天`, '连续']].map(([icon, value, label]) => <View key={label} style={{
          alignItems: 'center',
          flex: 1
        }}><Text style={{
            color: green,
            fontSize: 26
          }}>{icon}</Text><Text style={u.metric}>{value}</Text><Text style={u.secondary}>{label}</Text></View>)}</View></GlassSurface><GlassSurface style={u.statsCard}><Text style={u.cardHeading}>最近 7 天</Text><Bars days={week} /><Text style={u.total}>{duration(total)}</Text><Text style={u.secondary}>总时长　·　{week.filter(d => d.read + d.listen > 0).length} 个活跃日</Text></GlassSurface><GlassSurface style={u.statsCard}><Text style={u.cardHeading}>▥ 近 30 日</Text><Bars days={recentDays(stats, 30)} /><Text style={u.secondary}>只统计前台打开阅读器的时间，朗读单独计时。</Text></GlassSurface></>;
}
export default function Home(p) {
  const {
    data,
    tab,
    setTab,
    busy,
    openBook,
    removeBook,
    importBook,
    sourceId,
    setSourceId,
    keyword,
    setKeyword,
    results,
    setResults,
    sourceText,
    setSourceText,
    sourceUrl,
    setSourceUrl,
    importLink,
    importFile,
    importText,
    doSearch,
    addOnline,
    deleteSource,
    appearance,
    onSpeakRate,
    onPrefetch,
    onClearCache,
    onBackup,
    onRestore,
    onBookmark
  } = p;
  const [query, setQuery] = useState(''),
    [siteQuery, setSiteQuery] = useState(''),
    [sheet, setSheet] = useState(null),
    [selectedGroup, setSelectedGroup] = useState('全部');
  const source = data.sources.find(x => x.bookSourceUrl === sourceId);
  const groups = ['全部', ...new Set(data.sources.map(x => x.bookSourceGroup || '未分组'))];
  const cacheCount = data.books.filter(b => b.source).reduce((n, b) => n + b.chapters.filter(c => c.content).length, 0);
  const bookmarkCount = data.books.reduce((n, b) => n + (b.bookmarks?.length || 0), 0);
  const close = () => setSheet(null);
  const sheetTitle = sheet === '导入' ? '添加书源' : sheet === '详情' ? source?.bookSourceName : sheet;
  return <ImageBackground source={data.settings.appImage ? {
    uri: data.settings.appImage
  } : undefined} style={{
    flex: 1,
    backgroundColor: '#E8F1F1'
  }} imageStyle={{
    opacity: 1
  }}><StatusBar style="dark" /><LinearGradient colors={['#F7FAFA99', '#E4F4E166', '#CAE5ED88']} style={StyleSheet.absoluteFill} /><View pointerEvents="none" style={u.decoration}><LinearGradient colors={['#95D8BE88', '#BDDEE100']} style={u.orbOne} /><LinearGradient colors={['#9EC8EB88', '#DBE6F000']} style={u.orbTwo} /><LinearGradient colors={['#F1DDAD88', '#EFF0DD00']} style={u.orbThree} /></View><SafeAreaView style={{
      flex: 1
    }}><ScrollView contentContainerStyle={u.page}><View style={u.header}><Text style={u.title}>{tab === '书架' ? '全部' : tab}</Text><View style={{
            flexDirection: 'row',
            gap: 10
          }}>{tab === '书架' && <Action disabled={busy} onPress={importBook}>＋ 导入</Action>}{tab === '书源' && <Action onPress={() => setSheet('导入')}>＋</Action>}{tab === '设置' && <Text style={u.version}>栖读 0.7</Text>}</View></View>{busy && <GlassSurface style={u.notice}><Text style={{
            color: green
          }}>正在处理，请稍候…</Text></GlassSurface>}
  {tab === '书架' && <><GlassInput value={query} onChangeText={setQuery} placeholder="⌕ 搜索书名或作者" placeholderTextColor="#697E81" style={u.search} />{data.books.length === 0 && <GlassSurface style={u.statsCard}><Text style={u.cardHeading}>你的随身书房</Text><Text style={u.secondary}>导入一本书，或选择书源搜索。{'\n'}背景与字体，都可以换成喜欢的样子。</Text><View style={u.chips}><Action onPress={importBook}>导入 TXT</Action><Action onPress={() => setTab('书源')}>选择书源</Action></View></GlassSurface>}{data.books.filter(b => (b.title + (b.author || '')).toLowerCase().includes(query.toLowerCase())).map((b, i) => {
            const progress = Math.min(100, Math.round((b.index + (b.progress || 0)) / b.chapters.length * 100));
            return <GlassSurface key={b.id} onPress={() => openBook(b)} onLongPress={() => removeBook(b)} style={u.bookCard}><View style={u.bookBody}><LinearGradient colors={i % 2 ? ['#E9EAD3', '#789957'] : ['#FAFBF1', '#ABC38E']} style={u.cover}><Text style={u.coverMark}>⸙</Text><Text numberOfLines={4} style={u.coverTitle}>{b.title}</Text><Text style={u.coverFooter}>栖 · 读</Text></LinearGradient><View style={{
                  flex: 1,
                  gap: 9
                }}><View style={{
                    flexDirection: 'row',
                    gap: 8
                  }}><Text numberOfLines={1} style={[u.bookTitle, {
                      flex: 1
                    }]}>{b.title}</Text><Text style={u.percent}>{progress}%</Text></View><Text numberOfLines={1} style={u.secondary}>{b.author || '本地藏书'}</Text><Text numberOfLines={1} style={u.chapter}>▣ {b.chapters[b.index]?.title}</Text><View style={u.chips}><Text style={u.badge}>{b.chapters.length} 章</Text><Text style={u.badge}>{b.source ? '网络书籍' : 'TXT'}</Text>{!!b.bookmarks?.length && <Text style={u.badge}>{b.bookmarks.length} 书签</Text>}</View></View></View><View style={u.progress}><LinearGradient colors={['#B4CD98', '#748D61']} style={{
                  width: progress + '%',
                  height: 8,
                  borderRadius: 8
                }} /></View></GlassSurface>;
          })}</>}
  {tab === '书源' && <><GlassInput value={siteQuery} onChangeText={setSiteQuery} placeholder="⌕ 搜索站点或配置" placeholderTextColor="#697E81" style={u.search} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={u.chips}>{groups.map(g => <Action key={g} onPress={() => setSelectedGroup(g)}>{selectedGroup === g ? '● ' : ''}{g}</Action>)}</ScrollView><Text style={[u.secondary,{marginBottom:12}]}>点书源看推荐，长按搜索与管理</Text><View style={u.grid}>{data.sources.filter(x => (selectedGroup === '全部' || (x.bookSourceGroup || '未分组') === selectedGroup) && (x.bookSourceName + (x.bookSourceGroup || '')).toLowerCase().includes(siteQuery.toLowerCase())).map((x, i) => <GlassSurface key={x.bookSourceUrl} style={u.sourceTile} onPress={() => {
              setSourceId(x.bookSourceUrl);
              setResults([]);
              if (isDahuilang(x)||isSudugu(x)) setTab('发现'); else setSheet('详情');
            }} onLongPress={() => {setSourceId(x.bookSourceUrl);setResults([]);setSheet('详情');}}><View style={[u.sourceIcon, {
                backgroundColor: ['#9565A2', '#CA9350', '#4B8FAD'][i % 3]
              }]}><Text style={{
                  color: '#fff',
                  fontSize: 27,
                  fontWeight: '700'
                }}>{x.bookSourceName.includes('大灰狼') ? '🍅' : x.bookSourceName.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').slice(0, 1) || '源'}</Text></View><Text numberOfLines={2} style={u.tileTitle}>{x.bookSourceName}</Text><Text numberOfLines={1} style={u.secondary}>{x.bookSourceGroup || '通常书源'}</Text></GlassSurface>)}</View>{!data.sources.length && <GlassSurface style={u.statsCard}><Text style={u.cardHeading}>添加你的聚合书源</Text><Text style={u.secondary}>支持链接、JSON 文件和粘贴导入。大灰狼等复杂书源需验证 JS 与登录规则。</Text><Action onPress={() => setSheet('导入')}>＋ 添加书源</Action></GlassSurface>}</>}
  {tab === '发现' && <Discover selectedSourceId={sourceId} client={p.discoveryClient} sources={data.sources} onAdd={addOnline} onSources={(selected) => {const target=selected?.bookSourceUrl?selected:data.sources.find(item=>isDahuilang(item)||isSudugu(item));if(target){setSourceId(target.bookSourceUrl);setSheet('详情');}else setTab('书源');}} busy={busy}/> }
  {tab === '统计' && <Statistics stats={data.stats || {}} />}
  {tab === '设置' && <><GlassSurface style={u.settingsCard}><Row icon="▣" title="我的书签" detail={`${bookmarkCount} 个`} onPress={() => setTab('书签')} /><Row icon="▤" title="书源配置" detail={`${data.sources.length} 个`} onPress={() => setTab('书源')} /><Row icon="♬" title="朗读设置" detail={`${data.settings.speechRate || 1} 倍速`} onPress={() => setSheet('朗读设置')} /></GlassSurface><GlassSurface style={u.settingsCard}><Row icon="▣" title="阅读设置" detail="背景 / 字体 / 排版" onPress={() => setSheet('阅读设置')} /><Row icon="Aa" title="字体管理" detail={data.settings.font ? '已导入' : '系统字体'} onPress={() => setSheet('阅读设置')} /><View style={{
              padding: 22
            }}><Text style={u.rowTitle}>章节预缓存　{data.settings.prefetch || 0} 章</Text><View style={u.chips}>{[0, 5, 10, 50].map(n => <Action key={n} onPress={() => p.updateSettings({
                  prefetch: n
                })}>{n} 章</Action>)}</View><Text style={u.secondary}>手动缓存最近阅读的网络书籍，不在后台自动下载。</Text><Action disabled={busy || !data.settings.prefetch} onPress={onPrefetch}>开始缓存</Action></View></GlassSurface><GlassSurface style={u.settingsCard}><Row icon="◉" title="外观主题" detail="自定义背景" onPress={() => setSheet('外观主题')} /><Row icon="▥" title="统计" detail="阅读 / 听书" onPress={() => setTab('统计')} /><Row icon="▧" title="本地书籍" detail={`${data.books.filter(b => !b.source).length} 本`} onPress={importBook} /></GlassSurface><GlassSurface style={u.settingsCard}><Row icon="⇧" title="导出备份" detail="文件分享" onPress={onBackup} /><Row icon="⇩" title="恢复备份" detail="从 JSON 文件" onPress={onRestore} /><Row icon="▱" title="缓存管理" detail={`${cacheCount} 章`} onPress={() => setSheet('缓存管理')} /></GlassSurface><GlassSurface style={u.settingsCard}><Row icon="ⓘ" title="关于栖读" detail="0.7.0" onPress={() => setSheet('关于栖读')} /></GlassSurface></>}
  {tab === '书签' && <>{!bookmarkCount && <GlassSurface style={u.statsCard}><Text style={u.cardHeading}>收藏读到的片刻</Text><Text style={u.secondary}>在阅读器中点“书签”保存当前章节。</Text></GlassSurface>}{data.books.flatMap(b => (b.bookmarks || []).map(index => <GlassSurface key={b.id + ':' + index} style={u.statsCard} onPress={() => onBookmark(b, index)}><Text style={u.cardHeading}>{b.title}</Text><Text style={u.secondary}>▣ {b.chapters[index]?.title}</Text></GlassSurface>))}</>}
  </ScrollView><GlassTabs items={['书架', '发现', '书源', '统计', '设置']} value={tab === '书签' ? '书架' : tab} onChange={setTab} style={u.nav} />
  <Modal visible={!!sheet} transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={close}><SafeAreaView style={{
          flex: 1,
          backgroundColor: '#E3EFEDDD'
        }}><GlassMaterial radius={0} prominent /><View style={u.sheetHeader}><Text style={u.cardHeading}>{sheetTitle}</Text><Action onPress={close}>完成</Action></View><ScrollView contentContainerStyle={{
            padding: 22,
            paddingBottom: 60
          }} keyboardShouldPersistTaps="handled">
  {sheet === '导入' && <><Text style={u.secondary}>粘贴书源链接或导入 JSON 文件。导入成功不代表全部规则已兼容。</Text><GlassInput style={u.input} value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://…/source.json" placeholderTextColor="#697E81" /><Action disabled={busy || !sourceUrl.trim()} onPress={importLink}>从链接导入</Action><View style={{
                height: 20
              }} /><Action disabled={busy} onPress={importFile}>从 JSON 文件导入</Action><GlassInput style={[u.input, {
                minHeight: 110
              }]} value={sourceText} onChangeText={setSourceText} placeholder="或粘贴书源 JSON" placeholderTextColor="#697E81" multiline /><Action disabled={busy || !sourceText.trim()} onPress={importText}>导入粘贴内容</Action></>}
  {sheet === '详情' && source && <><Text selectable style={u.secondary}>{source.bookSourceUrl}</Text><Text style={[u.secondary, {
                color: '#71634A',
                marginVertical: 16
              }]}>{isDahuilang(source) ? '已接入 5.9.30 专用小说适配；可浏览搜索，付费正文需在当前线路登录验证。' : isSudugu(source) ? '已接入速读谷专用解析，支持新版域名、目录分页和正文分页。' : source.warnings?.length ? source.warnings.join('；') : '基础规则可尝试，实际可用性需搜索验证'}</Text>{isDahuilang(source) && p.accountPanel(source)}<GlassInput style={u.input} value={keyword} onChangeText={setKeyword} placeholder={isSudugu(source)?'书名、作者或速读谷书籍链接':'搜索书名或作者'} placeholderTextColor="#697E81" /><Action disabled={busy || !keyword.trim()} onPress={doSearch}>{busy ? '正在搜索…' : '搜索'}</Action>{results.map((item, i) => <GlassSurface key={item.url + i} style={u.statsCard}><Text style={u.cardHeading}>{item.title}</Text><Text style={u.secondary}>{item.author}</Text><Action disabled={busy} onPress={() => {
                  close();
                  addOnline(item);
                }}>加入书架并阅读</Action></GlassSurface>)}<View style={{
                height: 25
              }} /><Action onPress={() => {
                deleteSource(source);
                close();
              }}>移除此书源</Action></>}
  {sheet === '阅读设置' && appearance}
  {sheet === '朗读设置' && <><Text style={u.secondary}>使用系统中文语音朗读当前章节，章节结束后停止。iPhone 静音开关可能影响声音。</Text><View style={u.chips}>{[.7, .85, 1, 1.15, 1.3].map(rate => <Action key={rate} onPress={() => onSpeakRate(rate)}>{data.settings.speechRate === rate ? '● ' : ''}{rate} 倍速</Action>)}</View></>}
  {sheet === '外观主题' && <><Text style={u.secondary}>应用背景与阅读背景独立设置。</Text><View style={u.chips}><Action onPress={p.pickAppImage}>导入应用背景</Action><Action onPress={() => p.updateSettings({
                  appImage: null
                })}>恢复浅绿主题</Action></View></>}
  {sheet === '缓存管理' && <><Text style={u.secondary}>已有 {cacheCount} 章网络正文缓存。清理时保留每本书当前阅读章节，本地 TXT 与书签会保留。</Text><Action disabled={busy} onPress={() => {
                onClearCache();
                close();
              }}>清理其他章节缓存</Action></>}
  {sheet === '关于栖读' && <><Text style={u.total}>栖读</Text><Text style={u.secondary}>版本 0.7.0 · 安卓 / iOS{'\n'}参考你提供的界面，独立实现。{'\n'}{'\n'}本机保存书架与统计，支持系统朗读和文件备份。大灰狼 5.9.30 已有专用小说适配；云同步和通用 JS 书源运行尚未完成。{'\n'}{'\n'}不提供书籍内容。复杂聚合源的兼容状态以实际验证结果为准。</Text></>}
  </ScrollView></SafeAreaView></Modal></SafeAreaView></ImageBackground>;
}
const u=StyleSheet.create({
page:{paddingHorizontal:20,paddingTop:28,paddingBottom:140,maxWidth:850,width:'100%',alignSelf:'center'},
decoration:{...StyleSheet.absoluteFillObject,overflow:'hidden'},
orbOne:{position:'absolute',width:440,height:440,borderRadius:230,right:-130,top:-50,transform:[{rotate:'25deg'}]},
orbTwo:{position:'absolute',width:460,height:560,borderRadius:250,left:-230,top:280,transform:[{rotate:'-30deg'}]},
orbThree:{position:'absolute',width:360,height:440,borderRadius:230,right:-130,bottom:-80},
header:{height:86,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:3},title:{fontSize:33,fontWeight:'700',letterSpacing:1,color:'#203B42'},version:{color:'#526E72',fontSize:12},
search:{borderRadius:27,fontSize:16,paddingHorizontal:20,paddingVertical:16,marginBottom:18},
bookCard:{borderRadius:28,padding:20,marginBottom:16},bookBody:{flexDirection:'row',gap:19,alignItems:'center'},
cover:{width:76,height:110,borderRadius:8,borderWidth:3,borderColor:'#FFFFFFE0',padding:7,justifyContent:'space-between'},coverMark:{position:'absolute',fontSize:88,color:'#FCFFF0',opacity:.55,right:-5,top:0},coverTitle:{fontSize:14,color:'#49603C',lineHeight:19},coverFooter:{fontSize:8,color:'#5D774A',textAlign:'center'},
bookTitle:{color:'#203B42',fontSize:18,fontWeight:'600'},percent:{color:'#2A6A60',fontSize:11,backgroundColor:'#FFFFFF70',borderWidth:1,borderColor:'#FFFFFFCC',paddingHorizontal:8,paddingVertical:4,borderRadius:15,alignSelf:'flex-start'},
secondary:{fontSize:13,color:'#526B71',lineHeight:23},chapter:{fontSize:12,color:'#526C71'},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:14},badge:{fontSize:11,color:'#2A6A60',backgroundColor:'#FFFFFF6E',borderWidth:1,borderColor:'#FFFFFF99',paddingHorizontal:10,paddingVertical:5,borderRadius:18},
progress:{height:6,backgroundColor:'#748F871A',borderRadius:8,marginTop:18,overflow:'hidden'},action:{paddingHorizontal:16,paddingVertical:12,borderRadius:25,alignSelf:'flex-start',shadowOpacity:.04},
grid:{flexDirection:'row',flexWrap:'wrap',gap:12},sourceTile:{width:'30.5%',minHeight:158,borderRadius:25,padding:13,alignItems:'center',gap:9},sourceIcon:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:5},tileTitle:{color:'#254149',fontSize:14,fontWeight:'500',textAlign:'center',lineHeight:21},
statsCard:{borderRadius:28,padding:24,marginBottom:18,gap:12},cardHeading:{fontSize:19,fontWeight:'600',color:'#26434A'},ring:{width:180,height:180,borderRadius:100,borderWidth:14,borderColor:'#A4CFC05C',justifyContent:'center',alignItems:'center',alignSelf:'center',marginVertical:10},total:{fontSize:28,fontWeight:'700',color:'#24454B'},blueLine:{height:7,backgroundColor:'#64A6BE',borderRadius:8,marginTop:12},metrics:{flexDirection:'row',marginVertical:10},metric:{fontSize:18,color:'#27464C',marginVertical:10},bars:{height:140,flexDirection:'row',alignItems:'flex-end',gap:6,marginBottom:8},barColumn:{flex:1,alignItems:'center'},axis:{fontSize:11,color:'#60797B',marginTop:7},
settingsCard:{borderRadius:28,marginBottom:20},settingRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingVertical:18,gap:12,minHeight:66},rowIcon:{width:32,color:'#3E796F',fontSize:25},rowTitle:{fontSize:17,color:'#26454B',flex:1},rowDetail:{fontSize:12,color:'#5B7478',maxWidth:'43%'},chevron:{color:'#728C8E',fontSize:26},
nav:{position:'absolute',bottom:24,alignSelf:'center',borderRadius:38,width:'88%',maxWidth:460,shadowOpacity:.17,shadowRadius:28,shadowOffset:{width:0,height:10}},
notice:{padding:14,borderRadius:20,marginBottom:12},sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,gap:10},input:{borderRadius:20,padding:15,fontSize:15,marginVertical:16}
});
