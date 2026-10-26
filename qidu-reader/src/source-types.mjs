export function isSudugu(source) {
  try {const url=new URL(source?.bookSourceUrl);return ['www.sudugu.org','sudugu.org','www.shudugu.org','shudugu.org','www.suduguu.com','suduguu.com'].includes(url.hostname)&&['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&!url.port;}catch{return false;}
}
