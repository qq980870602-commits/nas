import test from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,recordTime,recentDays,streak} from '../src/stats.mjs';
test('阅读统计跨午夜按本地日期分开，原数据不被修改',()=>{
  const start=new Date(2026,9,26,23,59,50).getTime();const original={};
  const result=recordTime(original,start,start+20000);
  assert.equal(result['2026-10-26'].read,10);assert.equal(result['2026-10-27'].read,10);assert.deepEqual(original,{});
});
test('阅读和听书分别累计，日期序列补零，连续天数含昨天',()=>{
  const now=new Date(2026,9,26,12).getTime();let stats={};
  stats=recordTime(stats,now-86400000,now-86400000+60000);
  stats=recordTime(stats,now-2*86400000,now-2*86400000+30000,'listen');
  assert.equal(streak(stats,now),2);assert.equal(recentDays(stats,7,now).length,7);
  assert.equal(recentDays(stats,7,now).at(-1).read,0);assert.equal(dayKey(now),'2026-10-26');
});
