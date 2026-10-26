export function dayKey(time = Date.now()) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function recordTime(stats = {}, start, end, kind = 'read') {
  if (!['read','listen'].includes(kind) || end <= start) return stats;
  const next = {...stats};
  while (start < end) {
    const midnight = new Date(start); midnight.setHours(24,0,0,0);
    const stop = Math.min(end,midnight.getTime()), key = dayKey(start);
    const previous = next[key] || {read:0,listen:0};
    next[key] = {...previous,[kind]:(previous[kind] || 0)+(stop-start)/1000};
    start=stop;
  }
  return next;
}
export function recentDays(stats = {}, count = 7, now = Date.now()) {
  return Array.from({length:count},(_,i)=>{
    const date=new Date(now);date.setDate(date.getDate()-(count-1-i));
    const key=dayKey(date);return {key,label:['日','一','二','三','四','五','六'][date.getDay()],...(stats[key] || {read:0,listen:0})};
  });
}
export function streak(stats = {}, now = Date.now()) {
  const date=new Date(now);let count=0;
  if (!((stats[dayKey(date)]?.read || 0)+(stats[dayKey(date)]?.listen || 0))) date.setDate(date.getDate()-1);
  while ((stats[dayKey(date)]?.read || 0)+(stats[dayKey(date)]?.listen || 0)) {count++;date.setDate(date.getDate()-1);}
  return count;
}
