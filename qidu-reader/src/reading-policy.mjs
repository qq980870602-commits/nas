export const readingDefaults={followSystem:true,bindReaderTheme:false,lightBackground:'#DCE8DC',lightInk:'#283A30',darkBackground:'#1C1C1E',darkInk:'#C8C8CA',prefetch:5,readingPolicyVersion:1};
export function cacheLimit(value){return Math.max(0,Math.min(100,Math.floor(Number.isFinite(Number(value))?Number(value):5)));}
export function migrateReadingPolicy(settings={}){return settings.readingPolicyVersion?{...settings,prefetch:cacheLimit(settings.prefetch)}:{...settings,...readingDefaults,prefetch:cacheLimit(settings.prefetch??5)};}
export function readingColors(settings,scheme){
  if(settings.followSystem)return scheme==='dark'?{background:settings.darkBackground||readingDefaults.darkBackground,ink:settings.darkInk||readingDefaults.darkInk,image:null}:{background:settings.lightBackground||readingDefaults.lightBackground,ink:settings.lightInk||readingDefaults.lightInk,image:null};
  return settings.bindReaderTheme?{background:settings.appBackground,ink:settings.uiInk}:settings;
}
