import OpenCC from 'opencc-js';
import {validateTocRule} from './toc-rules.mjs';
let simplify;
export function validateReplacementRule(rule){if(!rule||typeof rule.pattern!=='string'||!rule.pattern.length||rule.pattern.length>120||typeof rule.replacement!=='string'||rule.replacement.length>500)throw Error('净化规则需要 1～120 字符匹配内容，替换文本不超过 500 字符');if(rule.regex)validateTocRule('^('+rule.pattern+')$');return rule;}
export function prepareContent(content,settings={}){let result=String(content||'');const rules=settings.cleanupRules||[];if(!Array.isArray(rules)||rules.length>100)throw Error('最多支持 100 条净化规则');for(const rule of rules){if(rule.enabled===false)continue;validateReplacementRule(rule);result=rule.regex?result.replace(new RegExp(rule.pattern,'gu'),rule.replacement):result.split(rule.pattern).join(rule.replacement);}if(settings.simplified){simplify??=OpenCC.Converter({from:'tw',to:'cn'});result=simplify(result);}return result;}

export function readerParagraphs(content,settings={}){return String(content||'').replace(/^\uFEFF/,'').split(/\r?\n+/).filter(x=>x.trim()).map((raw,index)=>({index,raw:raw.trim(),text:prepareContent(raw.trim(),settings)})).filter(p=>p.text.trim());}
