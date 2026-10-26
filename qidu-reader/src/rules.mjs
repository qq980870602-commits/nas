// Deliberately reject unsupported rules instead of silently returning the wrong book.
export function assertRule(rule = '') {
  if (/@js:|<js>|java\.|\{\{|@XPath:|^\/\/|##|&&|\|\|/.test(rule))
    throw new Error('此书源包含尚未兼容的 JS、XPath、模板或组合规则');
}
export function jsonValues(input, path) {
  assertRule(path);
  if (!/^\$?(?:\.?[\w-]+|\[\d+\]|\[\*\])*$/.test(path)) throw new Error('暂不支持此 JSONPath 表达式：' + path);
  const parts = path.replace(/^\$\.?/, '').replace(/\[(\d+|\*)\]/g, '.$1').split('.').filter(Boolean);
  return parts.reduce((items, key) => items.flatMap(value => key === '*' ? (Array.isArray(value) ? value : Object.values(value ?? {})) : value?.[key] === undefined ? [] : [value[key]]), [input]);
}
export function importSources(text) {
  const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  const sources = Array.isArray(parsed) ? parsed : [parsed];
  if (!sources.length) throw new Error('书源列表为空');
  return sources.map(s => {
    if (!s || typeof s.bookSourceName !== 'string' || !s.bookSourceName.trim() || typeof s.bookSourceUrl !== 'string' || !s.bookSourceUrl.trim()) throw new Error('书源缺少名称或标识');
    const warnings = [];
    for (const group of ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent'])
      for (const rule of Object.values(s[group] ?? {})) if (typeof rule === 'string') { try { assertRule(rule); } catch (e) { warnings.push(e.message); } }
    if (typeof s.searchUrl === 'string') {try {assertRule(s.searchUrl.replace(/\{\{(?:key|page)\}\}/g,''));}catch(e){warnings.push('搜索地址依赖 JS 或不支持的模板，当前无法搜索');}}
    if (s.jsLib) warnings.push('包含共享 JS 库，当前版本尚未执行');
    if (s.loginUrl || s.loginUi) warnings.push('此书源需要登录，当前版本未实现登录');
    if (s.enabledCookieJar) warnings.push('此书源依赖 Cookie，当前版本未实现 Cookie 管理');
    return {...s, warnings: [...new Set(warnings)]};
  });
}
export function searchAddress(source, keyword, page = 1) {
  const rule = source.searchUrl;
  if (!rule || /,\s*\{/.test(rule)) throw new Error('当前仅支持 GET 搜索地址');
  const replaced = rule.replace(/\{\{key\}\}/g, encodeURIComponent(keyword)).replace(/\{\{page\}\}/g, String(page));
  assertRule(replaced);
  try {return /^https?:\/\//.test(source.bookSourceUrl)?new URL(replaced, source.bookSourceUrl).href:new URL(replaced).href;}
  catch {throw new Error('此书源使用自定义标识，搜索规则必须解析出完整 HTTP/HTTPS 地址');}
}
export function splitChapters(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const chapters = []; let chapter = {title:'正文', content:''};
  for (const line of lines) {
    if (/^\s*(第[\d一二三四五六七八九十百千万零两]+[章回节卷].{0,50}|chapter\s+\d+.*)\s*$/i.test(line)) {
      if (chapter.content.trim()) chapters.push(chapter);
      chapter = {title:line.trim(), content:''};
    } else chapter.content += line + '\n';
  }
  if (chapter.content.trim() || !chapters.length) chapters.push(chapter);
  return chapters;
}
