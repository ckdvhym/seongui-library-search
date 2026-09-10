import { get, put } from '@vercel/blob';
export const PATHS={
 catalog:'schools/seongui-high/catalog/base-catalog.json',
 state:'schools/seongui-high/state/system-state.json',
 metaState:'schools/seongui-high/metadata/progress.json',
 searchIndex:'schools/seongui-high/search/search-index.json'
};
export async function readJson(path, fallback=null){
  try{const x=await get(path,{access:'private',useCache:false});if(!x?.stream)return fallback;return JSON.parse(await new Response(x.stream).text());}catch(e){if(fallback!==null)return fallback;throw e;}
}
export async function writeJson(path,obj){return put(path,JSON.stringify(obj),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});}
export function chunkPath(n){return `schools/seongui-high/metadata/chunks/${String(n).padStart(3,'0')}.json`;}
