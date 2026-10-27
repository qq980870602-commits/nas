import test from 'node:test';
import assert from 'node:assert/strict';
import {createDahuilangClient,dahuilangServers,dahuilangConfig,isDahuilang} from '../src/dahuilang.mjs';
const source={bookSourceName:'🍅大灰狼聚合5.9.30(vip完全版)',bookSourceUrl:'大灰狼融合VIP5.0',jsLib:"var host = ['https://one.example','http://unsafe.example','https://two.example'];globalThis.untrustedExecuted = true;"};
test('段评正文使用会员会话，社区页面仅携带当前线路 Cookie',async()=>{
  const client=createDahuilangClient({sessionProvider:async()=>({token:'session',deviceId:'device',server:'https://one.example'}),fetcher:async(url,options)=>{
    assert.equal(new URL(url).searchParams.get('review'),'1');
    assert.equal(JSON.parse(options.body).god,true);
    assert.equal(options.headers.Cookie,'qttoken=session; deviceId=device');
    return Response.json({code:0,content:'<p>真实正文<comment ident="/fanqie_comment?paragraph_id=2" count="7"/></p>'});
  }});
  const data=await client.chapterData(source,{dahuilang:{book_id:'1',item_id:'2',source:'番茄'}});
  assert.equal(data.content,'真实正文');assert.equal(data.communityReviews[0].count,7);
  assert.ok(!JSON.stringify(data).includes('session'));
  const page=await client.communityPage(source,data.communityReviews[0].url);
  assert.equal(page.headers.Cookie,'qttoken=session; deviceId=device');
  await assert.rejects(()=>client.communityPage(source,'https://other.example/fanqie_comment'),/当前书源/);
  const anonymous=createDahuilangClient();
  await assert.rejects(()=>anonymous.communityPage(source,'https://one.example/fanqie_comment'),/登录/);
});
test('静态识别线路，不执行书源脚本，限制版本及 HTTPS',()=>{
  assert.equal(isDahuilang(source),true);assert.deepEqual(dahuilangServers(source),['https://one.example','https://two.example']);assert.equal(globalThis.untrustedExecuted,undefined);
  assert.equal(isDahuilang({...source,bookSourceName:'大灰狼聚合5.9.31(vip完全版)'}),false);
  assert.throws(()=>dahuilangConfig({...source,dahuilang:{server:'https://other.example'}}),/HTTPS/);
});
test('付费适配登录→搜索→目录→正文，Cookie 不进入书籍数据',async()=>{
  const calls=[];let session=null;
  const client=createDahuilangClient({sessionProvider:async()=>session,fetcher:async(url,options)=>{
    const path=new URL(url).pathname;calls.push({url,options});assert.equal(options.redirect,'error');
    if(path==='/login_api') {assert.equal(options.headers.Cookie,undefined);assert.deepEqual(JSON.parse(options.body),{register_email:'reader@example.com',password:'test-password'});return Response.json({code:0,key:'mock-session'});}
    assert.equal(options.headers.Cookie,'qttoken=mock-session; deviceId=mock-device');
    if(path==='/search') {const q=new URL(url).searchParams;assert.equal(q.get('title'),'山 海');assert.equal(q.get('tab'),'小说');return Response.json({code:0,data:[{book_id:12,book_name:'书名（别名：另一个名）',author:'作者',source:'番茄',tab:'小说'}]});}
    if(path==='/catalog') {assert.equal(options.method,'POST');assert.equal(new URL(url).searchParams.get('book_id'),'12');assert.equal(options.body,'html=');return Response.json({code:0,data:[{source:'卷',item_id:'volume',title:'第一卷'},{item_id:34,title:'第一章',source:'番茄'}]});}
    if(path==='/content'){const body=JSON.parse(options.body);assert.equal(body.item_id,'34');assert.equal(body.god,false);return Response.json({code:0,content:'<p>第一段 &amp; 文字</p><p>第二段<br>换行</p><script>不应显示</script>'});}
    throw Error('Unexpected endpoint');
  }});
  session=await client.login(source,' reader@example.com ','test-password','mock-device');
  const books=await client.search(source,'山 海');assert.equal(books[0].title,'书名');assert.equal(books[0].author,'作者');
  const chapters=await client.catalog(source,books[0]);assert.equal(chapters.length,1);
  assert.equal(await client.chapterText(source,chapters[0]),'第一段 & 文字\n第二段\n换行');
  assert.equal(calls.length,4);assert.ok(!JSON.stringify({books,chapters}).includes('mock-session'));
});
test('未登录与切换域名后不发送旧令牌，服务权限错误不绕过',async()=>{
  let requests=0;
  const client=createDahuilangClient({sessionProvider:async()=>null,fetcher:async()=>{requests++;}});
  await assert.rejects(()=>client.chapterText(source,{dahuilang:{item_id:'1',source:'番茄'}}),/先.*登录/);assert.equal(requests,0);
  const other=createDahuilangClient({sessionProvider:async()=>({token:'session',deviceId:'device',server:'https://two.example'}),fetcher:async()=>{requests++;}});
  await assert.rejects(()=>other.search(source,'书'),/登录/);assert.equal(requests,0);
  const denied=createDahuilangClient({sessionProvider:async()=>({token:'session',deviceId:'device',server:'https://one.example'}),fetcher:async()=>Response.json({code:1,msg:'需要有效会员'})});
  await assert.rejects(()=>denied.search(source,'书'),/需要有效会员/);
});
test('服务允许时可匿名浏览搜索和目录，不发送伪造 Cookie',async()=>{
  const client=createDahuilangClient({fetcher:async(url,options)=>{
    assert.equal(options.headers.Cookie,undefined);
    return Response.json(new URL(url).pathname==='/search'?{code:0,data:[{book_id:'1',book_name:'测试书',source:'平台'}]}:{code:0,data:[{item_id:'2',title:'测试章'}]});
  }});
  const books=await client.search(source,'测试');assert.equal((await client.catalog(source,books[0])).length,1);
});
test('空正文、登录失败、异常响应不会伪装成成功',async()=>{
  const sessionProvider=async()=>({token:'session',deviceId:'device',server:'https://one.example'});
  const client=createDahuilangClient({sessionProvider,fetcher:async()=>Response.json({code:0,msg:'请重新登录'})});
  await assert.rejects(()=>client.chapterText(source,{dahuilang:{item_id:'1',source:'番茄'}}),/重新登录/);
  await assert.rejects(()=>client.login(source,'a@b.com','pass','device'),/缺少有效会话/);
  const html=createDahuilangClient({sessionProvider,fetcher:async()=>new Response('<html>错误</html>')});
  await assert.rejects(()=>html.search(source,'书'),/不是 JSON/);
});
test('发现分类过滤脚本及外站，推荐分页后可接目录',async()=>{
  const seen=[];
  const client=createDahuilangClient({fetcher:async(url,options)=>{
    const u=new URL(url);seen.push(url);assert.equal(options.headers.Cookie,undefined);
    if(u.pathname==='/discovestyle'){
      assert.equal(u.searchParams.get('source'),'番茄');assert.equal(u.searchParams.get('source_type'),'女频');
      return Response.json({code:0,data:[{title:'☆ 排行榜 ☆',url:''},{title:'推荐榜',url:'https://one.example/get_discover?source=番茄&tab=小说&page={{page}}'},{title:'其他站点',url:'https://other.example/get_discover?tab=小说'},{title:'脚本',url:'<js>run()</js>'},{title:'重复推荐榜',url:'https://one.example/get_discover?source=番茄&tab=小说&page={{page}}'}]});
    }
    if(u.pathname==='/get_discover'){assert.equal(u.searchParams.get('page'),'2');return Response.json({code:0,data:[{book_id:1,book_name:'推荐书',author:'作者',source:'番茄',abstract:'<p>推荐简介</p>',thumb_url:'https://cover.example/1.jpg'}]});}
    if(u.pathname==='/catalog')return Response.json({code:0,data:[{item_id:2,title:'第一章',source:'番茄'}]});
    throw Error('Unexpected request');
  }});
  const entries=await client.discoveryCategories(source,{channel:'女频'});assert.equal(entries.length,1);assert.equal(entries[0].title,'推荐榜');assert.equal(entries[0].group,'排行榜');
  const books=await client.discover(source,entries[0],2);assert.equal(books[0].intro,'推荐简介');assert.equal(books[0].coverUrl,'https://cover.example/1.jpg');assert.equal((await client.catalog(source,books[0]))[0].title,'第一章');
  const requests=seen.length;await assert.rejects(()=>client.discover(source,{url:'https://other.example/get_discover?tab=小说'}),/当前线路/);await assert.rejects(()=>client.discover(source,entries[0],0),/页码/);assert.equal(seen.length,requests);
});
test('旧书架从原始链接恢复大灰狼详情标识并保留阅读位置',async()=>{
 const meta={book_id:'12',source:'番茄',tab:'小说',url:''};
 const client=createDahuilangClient({fetcher:async(url,options)=>{assert.equal(new URL(url).pathname,'/detail');assert.equal(new URL(url).searchParams.get('book_id'),'12');assert.equal(options.method,'POST');return Response.json({code:0,data:{book_id:'12',book_name:'作品名',source:'番茄',author:'作者',abstract:'<p>作品介绍</p>',word_number:4882000,status:'连载中',last_chapter_update_time:'1小时前'}});}});
 const info=await client.bookInfo(source,{id:'saved',title:'作品名',originUrl:'dahuilang:'+encodeURIComponent(JSON.stringify(meta)),index:7,progress:.3});assert.equal(info.intro,'作品介绍');assert.equal(info.status,'连载中');assert.equal(info.wordCount,'4882000');assert.equal(info.updatedAt,'1小时前');assert.equal(info.index,7);assert.equal(info.progress,.3);
});
