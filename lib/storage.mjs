import { get, put } from '@vercel/blob';
export const PATHS={
 catalog:'schools/seongui-high/catalog/base-catalog.json',
 state:'schools/seongui-high/state/system-state.json',
 metaState:'schools/seongui-high/metadata/progress.json',
 searchIndex:'schools/seongui-high/search/search-index.json',
 searchBuildState:'schools/seongui-high/search/build-progress.json',
 schoolSettings:'schools/seongui-high/config/school-settings.json'
};
const MEM_CACHE=new Map(),INFLIGHT=new Map();
export async function readJson(path, fallback=null, {ttlMs=0}={}){
  const now=Date.now(),cached=MEM_CACHE.get(path);
  if(ttlMs>0&&cached&&now-cached.at<ttlMs)return cached.value;
  if(ttlMs>0&&INFLIGHT.has(path))return INFLIGHT.get(path);
  const task=(async()=>{
    try{const x=await get(path,{access:'private',useCache:false});if(!x?.stream)return fallback;const value=JSON.parse(await new Response(x.stream).text());if(ttlMs>0)MEM_CACHE.set(path,{at:Date.now(),value});return value;}
    catch(e){if(fallback!==null)return fallback;throw e;}
    finally{INFLIGHT.delete(path);}
  })();
  if(ttlMs>0)INFLIGHT.set(path,task);
  return task;
}
export function clearJsonCache(path){if(path)MEM_CACHE.delete(path);else MEM_CACHE.clear();}

export async function writeJson(path,obj){const out=await put(path,JSON.stringify(obj),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});MEM_CACHE.set(path,{at:Date.now(),value:obj});return out;}
export function chunkPath(n){return `schools/seongui-high/metadata/chunks/${String(n).padStart(3,'0')}.json`;}

export function searchChunkPath(n){return `schools/seongui-high/search/build-chunks/${String(n).padStart(3,'0')}.json`;}
