import {importSources} from './rules.mjs';

export async function downloadSourceText(input, {fetcher = fetch, timeout = 15000} = {}) {
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('请输入完整的书源链接'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('书源链接须为 HTTP 或 HTTPS 地址，且不能包含账号密码');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(url.href, {signal:controller.signal, headers:{Accept:'application/json, text/plain, */*'}});
    if (!response.ok) throw new Error('下载书源失败：HTTP ' + response.status);
    if (Number(response.headers.get('content-length')) > 4 * 1024 * 1024)
      throw new Error('书源文件超过当前 4 MB 限制，请拆分后导入');
    const text = (await response.text()).replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('服务器返回了空文件');
    if (text.length > 4 * 1024 * 1024) throw new Error('书源内容过大，请拆分后导入');
    if (text.startsWith('<')) throw new Error('链接返回的是网页，可能需要登录或验证码；请下载 JSON 文件后导入');
    importSources(text);
    return text;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('书源下载超时，请稍后重试或从文件导入');
    if (error instanceof TypeError) throw new Error('无法连接书源地址，请检查网络、HTTPS 证书，或从文件导入');
    if (error instanceof SyntaxError) throw new Error('链接返回的内容不是有效的书源 JSON');
    throw error;
  } finally { clearTimeout(timer); }
}
