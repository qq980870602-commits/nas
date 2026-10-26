import {dahuilangClient} from './dahuilang.mjs';
import {suduguClient} from './sudugu.mjs';
import {isSudugu} from './source-types.mjs';
export const discoveryClient={
  discoveryCategories:(source,options)=>(isSudugu(source)?suduguClient:dahuilangClient).discoveryCategories(source,options),
  discover:(source,entry,page)=>(isSudugu(source)?suduguClient:dahuilangClient).discover(source,entry,page)
};
