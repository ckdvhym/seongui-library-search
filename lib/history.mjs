import {readJson,writeJson,PATHS} from './storage.mjs';
export async function addHistory(type,message,detail={}){try{const doc=await readJson(PATHS.changeHistory,{version:'V9.0',items:[]});doc.items=[{at:new Date().toISOString(),type:String(type||'change'),message:String(message||''),detail},...(doc.items||[])].slice(0,200);await writeJson(PATHS.changeHistory,doc);}catch{}}
