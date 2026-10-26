import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, ImageBackground, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Picker from 'expo-document-picker';
import * as FS from 'expo-file-system/legacy';
import * as Font from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import Home from './src/Home.jsx';
import { GlassProvider, GlassSurface } from './src/Glass.jsx';
import { recordTime } from './src/stats.mjs';
import DahuilangAccount, { readDahuilangSession } from './src/DahuilangAccount.jsx';
import { configureDahuilangSessionProvider } from './src/dahuilang.mjs';
import { importSources, splitChapters } from './src/rules.mjs';
import { search, catalog, chapterText } from './src/source.mjs';
import { downloadSourceText } from './src/source-import.mjs';
const LIBRARY = FS.documentDirectory + 'qidu-library.json';
if (Platform.OS !== 'web') configureDahuilangSessionProvider(readDahuilangSession);
const initial = {
  books: [],
  sources: [],
  stats: {},
  settings: {
    prefetch: 5,
    speechRate: 1,
    appImage: null,
    size: 21,
    spacing: 1.85,
    background: '#F5F0E6',
    ink: '#332F29',
    image: null,
    font: null
  }
};
const palettes = [['纸白', '#FAFAF7', '#282C29'], ['羊皮', '#F5F0E6', '#332F29'], ['豆绿', '#DCE8DC', '#283A30'], ['夜读', '#202623', '#CBD4CC']];
function Button({
  children,
  onPress,
  active,
  disabled
}) {
  return <GlassSurface disabled={disabled} onPress={onPress} style={[s.button, active && s.active, disabled && {
    opacity: .4
  }]} dark={active}><Text style={[s.buttonText, active && {
      color: '#fff'
    }]}>{children}</Text></GlassSurface>;
}
function ReaderApp() {
  const [data, setData] = useState(initial),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState('书架');
  const [bookId, setBookId] = useState(null),
    [panel, setPanel] = useState(null),
    [busy, setBusy] = useState(false);
  const [sourceId, setSourceId] = useState(null),
    [keyword, setKeyword] = useState(''),
    [results, setResults] = useState([]),
    [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('https://sy.langge.uk/api/download/安卓阅读app-大灰狼融合5.0(vip完全版).json');
  const [fontReady, setFontReady] = useState(null),
    [speaking, setSpeaking] = useState(false);
  const speechToken = useRef(0);
  const reader = useRef(null),
    restore = useRef(true),
    lastSave = useRef(0),
    saveQueue = useRef(Promise.resolve()),
    saveAllowed = useRef(true);
  const book = data.books.find(b => b.id === bookId),
    settings = data.settings,
    chapter = book?.chapters[book.index];
  const source = data.sources.find(x => x.bookSourceUrl === sourceId);
  const updateSettings = value => setData(d => ({
    ...d,
    settings: {
      ...d.settings,
      ...value
    }
  }));
  const updateBook = (id, value) => setData(d => ({
    ...d,
    books: d.books.map(b => b.id === id ? {
      ...b,
      ...value
    } : b)
  }));
  const run = async action => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('未能完成', e.message || String(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    (async () => {
      try {
        const info = await FS.getInfoAsync(LIBRARY);
        if (info.exists) {
          const parsed = JSON.parse(await FS.readAsStringAsync(LIBRARY));
          if (!Array.isArray(parsed.books) || !Array.isArray(parsed.sources)) throw new Error('数据格式错误');
          setData({
            ...initial,
            ...parsed,
            settings: {
              ...initial.settings,
              ...parsed.settings
            }
          });
        }
      } catch (e) {
        saveAllowed.current = false;
        Alert.alert('读取存储失败', e.message + '。为保留原数据，本次会话暂停保存。');
      } finally {
        setReady(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!ready || !saveAllowed.current) return;
    const timer = setTimeout(() => {
      const snapshot = JSON.stringify(data);
      saveQueue.current = saveQueue.current.then(async () => {
        await FS.writeAsStringAsync(LIBRARY + '.tmp', snapshot);
        await FS.moveAsync({
          from: LIBRARY + '.tmp',
          to: LIBRARY
        });
      }).catch(e => Alert.alert('保存失败', e.message));
    }, 350);
    return () => clearTimeout(timer);
  }, [data, ready]);
  useEffect(() => {
    const f = settings.font;
    if (!f) {
      setFontReady(null);
      return;
    }
    let valid = true;
    Font.loadAsync({
      [f.name]: f.uri
    }).then(() => {
      if (valid) setFontReady(f.name);
    }).catch(e => Alert.alert('字体加载失败', e.message));
    return () => {
      valid = false;
    };
  }, [settings.font]);
  useEffect(() => {
    restore.current = true;
  }, [bookId, book?.index]);
  useEffect(() => {
    speechToken.current++;
    Speech.stop();
    setSpeaking(false);
    return () => {
      speechToken.current++;
      Speech.stop();
    };
  }, [bookId, book?.index]);
  useEffect(() => {
    if (!ready || !bookId || panel && !speaking) return;
    let start = Date.now(),
      active = AppState.currentState === 'active';
    const flush = () => {
      const end = Date.now(),
        since = start;
      if (active && end > since) setData(d => ({
        ...d,
        stats: recordTime(d.stats, since, end, speaking ? 'listen' : 'read')
      }));
      start = end;
    };
    const timer = setInterval(flush, 15000);
    const sub = AppState.addEventListener('change', state => {
      flush();
      active = state === 'active';
      if (!active && speaking) {
        speechToken.current++;
        Speech.stop();
        setSpeaking(false);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      flush();
    };
  }, [ready, bookId, panel, speaking]);
  const toggleSpeech = () => {
    if (speaking) {
      speechToken.current++;
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!chapter?.content) {
      Alert.alert('没有正文', '请先加载当前章节');
      return;
    }
    const token = ++speechToken.current,
      chunks = chapter.content.match(/[\s\S]{1,1000}/g) || [];
    setSpeaking(true);
    const speakChunk = index => {
      if (token !== speechToken.current) return;
      if (index >= chunks.length) {
        setSpeaking(false);
        return;
      }
      Speech.speak(chunks[index], {
        language: 'zh-CN',
        rate: settings.speechRate || 1,
        onDone: () => speakChunk(index + 1),
        onError: e => {
          setSpeaking(false);
          Alert.alert('朗读失败', e.message || '请检查系统语音设置');
        }
      });
    };
    speakChunk(0);
  };
  const toggleBookmark = () => {
    const marks = book.bookmarks || [];
    updateBook(book.id, {
      bookmarks: marks.includes(book.index) ? marks.filter(i => i !== book.index) : [...marks, book.index]
    });
  };
  const exportBackup = () => run(async () => {
    if (!(await Sharing.isAvailableAsync())) throw new Error('此设备不支持文件分享');
    const uri = FS.cacheDirectory + 'qidu-backup-' + Date.now() + '.json';
    await FS.writeAsStringAsync(uri, JSON.stringify({
      format: 'qidu-backup',
      version: 1,
      data: {
        ...data,
        settings: {
          ...settings,
          font: null,
          image: null,
          appImage: null
        }
      }
    }));
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: '保存栖读备份'
    });
  });
  const restoreBackup = () => run(async () => {
    const result = await Picker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true
    });
    if (result.canceled) return;
    const backup = JSON.parse(await FS.readAsStringAsync(result.assets[0].uri));
    const saved = backup.data;
    if (backup.format !== 'qidu-backup' || backup.version !== 1 || !saved || !Array.isArray(saved.books) || !Array.isArray(saved.sources)) throw new Error('不是有效的栖读备份文件');
    if (saved.books.some(b => typeof b.id !== 'string' || typeof b.title !== 'string' || !Array.isArray(b.chapters) || !b.chapters.length || !Number.isInteger(b.index) || b.index < 0 || b.index >= b.chapters.length || b.chapters.some(c => typeof c.title !== 'string' || c.content !== undefined && typeof c.content !== 'string'))) throw new Error('备份书籍数据不完整');
    const sources = saved.sources.length ? importSources(JSON.stringify(saved.sources)) : [];
    const candidate = {
      ...initial,
      ...saved,
      sources,
      settings: {
        ...initial.settings,
        ...saved.settings,
        font: null,
        image: null,
        appImage: null
      }
    };
    if (!Number.isFinite(candidate.settings.size) || candidate.settings.size < 14 || candidate.settings.size > 36 || !Number.isFinite(candidate.settings.spacing) || candidate.settings.spacing < 1.2 || candidate.settings.spacing > 2.6) throw new Error('备份排版设置不合法');
    Alert.alert('恢复备份', '这会替换当前书架、书源、统计和设置；备份不包含自定义图片与字体文件。', [{
      text: '取消'
    }, {
      text: '恢复',
      onPress: () => {
        saveAllowed.current = true;
        setData(candidate);
      }
    }]);
  });
  const prefetchBook = () => run(async () => {
    const target = [...data.books].filter(b => b.source).sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0))[0];
    if (!target) throw new Error('请先添加一本网络书籍');
    let fetched = 0;
    try {
      for (let i = target.index + 1; i < Math.min(target.chapters.length, target.index + 1 + (settings.prefetch || 0)); i++) {
        if (target.chapters[i].content) continue;
        const content = await chapterText(target.source, target.chapters[i]);
        setData(d => ({
          ...d,
          books: d.books.map(b => b.id === target.id ? {
            ...b,
            chapters: b.chapters.map((c, j) => j === i ? {
              ...c,
              content
            } : c)
          } : b)
        }));
        fetched++;
      }
    } catch (e) {
      throw new Error('已缓存 ' + fetched + ' 章，随后失败：' + e.message);
    }
    Alert.alert('缓存完成', target.title + '：新增 ' + fetched + ' 章');
  });
  const clearCache = () => setData(d => ({
    ...d,
    books: d.books.map(b => b.source ? {
      ...b,
      chapters: b.chapters.map((c, i) => i === b.index ? c : {
        ...c,
        content: undefined
      })
    } : b)
  }));
  const pick = async kind => {
    const result = await Picker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (kind === 'book') {
      if (!/\.txt$/i.test(asset.name)) throw new Error('本版本支持 UTF-8 编码 TXT 文件');
      if (asset.size > 5 * 1024 * 1024) throw new Error('当前版本请导入 5 MB 以内的 TXT');
      const text = await FS.readAsStringAsync(asset.uri);
      if (!text.trim()) throw new Error('文件内容为空');
      const id = String(Date.now());
      const b = {
        id,
        title: asset.name.replace(/\.txt$/i, ''),
        chapters: splitChapters(text),
        index: 0,
        progress: 0
      };
      setData(d => ({
        ...d,
        books: [b, ...d.books]
      }));
    } else if (kind === 'source') {
      addSources(await FS.readAsStringAsync(asset.uri));
    } else {
      const valid = kind === 'font' ? /\.(ttf|otf)$/i : /\.(png|jpe?g|webp)$/i;
      if (!valid.test(asset.name)) throw new Error(kind === 'font' ? '请选择 TTF 或 OTF 字体' : '请选择 PNG、JPG 或 WebP 图片');
      const uri = FS.documentDirectory + kind + '-' + Date.now() + '.' + asset.name.split('.').pop();
      await FS.copyAsync({
        from: asset.uri,
        to: uri
      });
      updateSettings(kind === 'font' ? {
        font: {
          name: 'UserFont' + Date.now(),
          uri
        }
      } : kind === 'appImage' ? {
        appImage: uri
      } : {
        image: uri
      });
    }
  };
  const addSources = text => {
    const imported = importSources(text);
    setData(d => {
      const map = new Map(d.sources.map(x => [x.bookSourceUrl, x]));
      imported.forEach(x => map.set(x.bookSourceUrl, x));
      return {
        ...d,
        sources: [...map.values()]
      };
    });
    setSourceText('');
    Alert.alert('书源已导入', `${imported.length} 个书源。请查看兼容提示后搜索。`);
  };
  const openBook = b => {
    updateBook(b.id, {
      lastRead: Date.now()
    });
    setBookId(b.id);
    if (b.source && !b.chapters[b.index].content) run(() => loadChapter(b, b.index));
  };
  const loadChapter = async (b, index) => {
    const content = await chapterText(b.source, b.chapters[index]);
    const chapters = b.chapters.map((c, i) => i === index ? {
      ...c,
      content
    } : c);
    updateBook(b.id, {
      chapters,
      index,
      progress: 0
    });
  };
  const goChapter = index => run(async () => {
    if (index < 0 || index >= book.chapters.length) return;
    if (book.source && !book.chapters[index].content) await loadChapter(book, index);else updateBook(book.id, {
      index,
      progress: 0
    });
    setPanel(null);
  });
  const addOnline = (item, selectedSource = source) => run(async () => {
    if (!selectedSource) throw new Error('请先选择书源');
    const existing = data.books.find(b => b.originUrl === item.url && b.source?.bookSourceUrl === selectedSource.bookSourceUrl);
    if (existing) {openBook(existing);return;}
    const chapters = await catalog(selectedSource, item);
    const b = {
      id: String(Date.now()),
      title: item.title,
      author: item.author,
      source: selectedSource,
      originUrl: item.url,
      chapters,
      index: 0,
      progress: 0
    };
    const content = await chapterText(selectedSource, chapters[0]);
    b.chapters[0].content = content;
    setData(d => ({
      ...d,
      books: [b, ...d.books]
    }));
    setBookId(b.id);
  });
  const settingView = <GlassSurface style={[s.section, {
    backgroundColor: '#F5F6EE',
    borderRadius: 20
  }]}><Text style={s.heading}>把阅读调成喜欢的样子</Text><Text style={s.label}>阅读背景</Text><View style={s.row}>{palettes.map(([name, background, ink]) => <Button key={name} active={settings.background === background && !settings.image} onPress={() => updateSettings({
        background,
        ink,
        image: null
      })}>{name}</Button>)}</View><View style={s.row}><Button onPress={() => run(() => pick('image'))}>导入背景图片</Button><Button onPress={() => updateSettings({
        image: null
      })}>移除图片</Button></View><Text style={s.label}>字体</Text><View style={s.row}><Button active={!settings.font} onPress={() => updateSettings({
        font: null
      })}>系统字体</Button><Button active={!!settings.font} onPress={() => run(() => pick('font'))}>导入 TTF / OTF</Button></View><Text style={s.label}>字号 · {settings.size}</Text><View style={s.row}><Button onPress={() => updateSettings({
        size: Math.max(14, settings.size - 1)
      })}>A −</Button><Button onPress={() => updateSettings({
        size: Math.min(36, settings.size + 1)
      })}>A ＋</Button></View><Text style={s.label}>行距 · {settings.spacing.toFixed(2)}</Text><View style={s.row}><Button onPress={() => updateSettings({
        spacing: Math.max(1.2, settings.spacing - .1)
      })}>紧凑</Button><Button onPress={() => updateSettings({
        spacing: Math.min(2.6, settings.spacing + .1)
      })}>宽松</Button></View><View style={{
      backgroundColor: settings.background,
      padding: 20,
      borderRadius: 16,
      marginTop: 18
    }}><Text style={{
        color: settings.ink,
        fontSize: settings.size,
        lineHeight: settings.size * settings.spacing,
        fontFamily: fontReady ?? undefined
      }}>风翻过书页，时间慢了下来。{'\n'}在文字里，找到自己的片刻宁静。</Text></View></GlassSurface>;
  if (!ready) return <SafeAreaView style={s.root}><Text style={s.subtitle}>正在打开书架…</Text></SafeAreaView>;
  if (book) return <SafeAreaView style={[s.root, {
    backgroundColor: settings.background
  }]}><StatusBar style={settings.background === '#202623' ? 'light' : 'dark'} /><GlassSurface style={s.readerToolbar} prominent><Button onPress={() => setBookId(null)}>‹ 书架</Button><Button onPress={() => setPanel('目录')}>目录</Button><Button onPress={toggleSpeech}>{speaking ? '停止' : '朗读'}</Button><Button onPress={() => setPanel('排版')}>Aa 排版</Button></GlassSurface><ImageBackground source={settings.image ? {
      uri: settings.image
    } : undefined} style={{
      flex: 1
    }} imageStyle={{
      opacity: .3
    }}><ScrollView key={book.id + ':' + book.index} ref={reader} contentContainerStyle={{
        padding: 26,
        paddingBottom: 70
      }} onContentSizeChange={(w, h) => {
        if (restore.current) {
          reader.current?.scrollTo({
            y: (book.progress || 0) * h,
            animated: false
          });
          restore.current = false;
        }
      }} scrollEventThrottle={250} onScroll={e => {
        const n = Date.now();
        if (n - lastSave.current > 500) {
          lastSave.current = n;
          updateBook(book.id, {
            progress: e.nativeEvent.contentOffset.y / Math.max(1, e.nativeEvent.contentSize.height)
          });
        }
      }}><Text style={{
          fontSize: 14,
          color: settings.ink,
          opacity: .55,
          marginBottom: 28
        }}>{book.title} · {book.index + 1}/{book.chapters.length}</Text><Text style={{
          fontSize: 26,
          color: settings.ink,
          fontWeight: '600',
          marginBottom: 26
        }}>{chapter.title}</Text><Text selectable style={{
          color: settings.ink,
          fontFamily: fontReady ?? undefined,
          fontSize: settings.size,
          lineHeight: settings.size * settings.spacing
        }}>{chapter.content || '正文尚未加载，请重新进入本书重试。'}</Text></ScrollView></ImageBackground><GlassSurface style={s.readerToolbar} prominent><Button disabled={busy || book.index === 0} onPress={() => goChapter(book.index - 1)}>上一章</Button><Button onPress={toggleBookmark}>{(book.bookmarks || []).includes(book.index) ? '已加书签' : '＋ 书签'}</Button><Button disabled={busy || book.index === book.chapters.length - 1} onPress={() => goChapter(book.index + 1)}>下一章</Button></GlassSurface><Modal visible={!!panel} animationType="slide" onRequestClose={() => setPanel(null)}><SafeAreaView style={s.root}><GlassSurface style={s.readerToolbar} prominent><Text style={s.heading}>{panel}</Text><Button onPress={() => setPanel(null)}>完成</Button></GlassSurface><ScrollView>{panel === '排版' ? settingView : book.chapters.map((c, i) => <TouchableOpacity disabled={busy} key={i} style={s.catalog} onPress={() => goChapter(i)}><Text style={{
              color: i === book.index ? '#426B56' : '#333'
            }}>{c.title}</Text></TouchableOpacity>)}</ScrollView></SafeAreaView></Modal></SafeAreaView>;
  return <Home data={data} tab={tab} setTab={setTab} busy={busy} openBook={openBook} removeBook={b => Alert.alert('移除书籍', b.title, [{
    text: '取消'
  }, {
    text: '移除',
    style: 'destructive',
    onPress: () => setData(d => ({
      ...d,
      books: d.books.filter(x => x.id !== b.id)
    }))
  }])} importBook={() => run(() => pick('book'))} sourceId={sourceId} setSourceId={setSourceId} keyword={keyword} setKeyword={setKeyword} results={results} setResults={setResults} sourceText={sourceText} setSourceText={setSourceText} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} importLink={() => run(async () => addSources(await downloadSourceText(sourceUrl)))} importFile={() => run(() => pick('source'))} importText={() => run(async () => addSources(sourceText))} doSearch={() => run(async () => {
    setResults([]);
    const found = await search(source, keyword.trim());
    setResults(found);
    if (!found.length) Alert.alert('没有搜索结果', '请检查关键词或书源规则。');
  })} addOnline={addOnline} deleteSource={x => {
    setData(d => ({
      ...d,
      sources: d.sources.filter(y => y.bookSourceUrl !== x.bookSourceUrl)
    }));
    setSourceId(null);
    setResults([]);
  }} appearance={settingView} updateSettings={updateSettings} pickAppImage={() => run(() => pick('appImage'))} accountPanel={selected => <DahuilangAccount source={selected} onConfig={config => setData(d => ({
    ...d,
    sources: d.sources.map(s => s.bookSourceUrl === selected.bookSourceUrl ? {
      ...s,
      dahuilang: config
    } : s),
    books: d.books.map(b => b.source?.bookSourceUrl === selected.bookSourceUrl ? {
      ...b,
      source: {
        ...b.source,
        dahuilang: config
      }
    } : b)
  }))} />} onSpeakRate={rate => updateSettings({
    speechRate: rate
  })} onPrefetch={prefetchBook} onClearCache={clearCache} onBackup={exportBackup} onRestore={restoreBackup} onBookmark={(b, index) => {
    updateBook(b.id, {
      index,
      progress: 0,
      lastRead: Date.now()
    });
    setBookId(b.id);
    if (b.source && !b.chapters[index].content) run(() => loadChapter(b, index));
  }} />;
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFBF8',
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  page: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 850,
    width: '100%',
    alignSelf: 'center'
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#829083',
    marginTop: 12
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#263B30'
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#EBF0E9',
    borderRadius: 22,
    alignSelf: 'flex-start'
  },
  buttonText: {
    color: '#426B56',
    fontSize: 14
  },
  active: {
    backgroundColor: '#426B56'
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  hero: {
    backgroundColor: '#E5EBDF',
    padding: 26,
    borderRadius: 25,
    marginBottom: 28
  },
  heroTitle: {
    fontSize: 24,
    color: '#324B3B',
    fontWeight: '600'
  },
  heroText: {
    fontSize: 14,
    color: '#6B7C6C',
    marginTop: 10
  },
  heroCount: {
    fontSize: 12,
    color: '#6B7C6C',
    marginTop: 36
  },
  heading: {
    fontSize: 19,
    fontWeight: '600',
    color: '#304534',
    marginBottom: 16
  },
  empty: {
    paddingVertical: 35,
    gap: 10
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    color: '#7B857D',
    marginVertical: 8
  },
  book: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: '#EDF0EA'
  },
  cover: {
    width: 85,
    height: 118,
    borderRadius: 7,
    padding: 13,
    justifyContent: 'space-between'
  },
  coverTitle: {
    fontSize: 17,
    color: '#FFF',
    fontWeight: '500'
  },
  coverLine: {
    color: '#D9E0D6',
    fontSize: 9
  },
  bookTitle: {
    fontSize: 18,
    color: '#304534',
    fontWeight: '500'
  },
  muted: {
    fontSize: 12,
    color: '#90988F'
  },
  track: {
    height: 3,
    backgroundColor: '#E4E9E0',
    marginTop: 18,
    borderRadius: 4
  },
  fill: {
    height: 3,
    backgroundColor: '#6E8B71'
  },
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#E8EDE5',
    paddingVertical: 12,
    backgroundColor: '#FAFBF8'
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  navText: {
    fontSize: 12,
    color: '#9A9E98'
  },
  section: {
    padding: 20
  },
  label: {
    fontSize: 14,
    color: '#526451',
    marginTop: 22,
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#DCE4D8',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginVertical: 14,
    color: '#304534'
  },
  source: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#E6EBE1',
    gap: 8
  },
  readerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    gap: 8
  },
  catalog: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E6EBE1'
  }
});
export default function App(){return <GlassProvider><ReaderApp/></GlassProvider>;}
