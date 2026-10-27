import {dahuilangClient} from './dahuilang.mjs';
import {suduguClient} from './sudugu.mjs';
import {isSudugu} from './source-types.mjs';
export const discoveryClient={
  bookInfo:(source,book)=>(isSudugu(source)?suduguClient:dahuilangClient).bookInfo(source,book),
  catalog:(source,book)=>(isSudugu(source)?suduguClient:dahuilangClient).catalog(source,book),
  discoveryCategories:(source,options)=>(isSudugu(source)?suduguClient:dahuilangClient).discoveryCategories(source,options),
  discover:(source,entry,page)=>(isSudugu(source)?suduguClient:dahuilangClient).discover(source,entry,page)
};
