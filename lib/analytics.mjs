import {readJson,writeJson,analyticsDayPath} from './storage.mjs';
function dayKey(d=new Date()){return d.toISOString().slice(0,10);}
function cleanQuery(q){return String(q||'').trim().replace(/\s+/g,' ').slice(0,100);}
export async function logSearch(q,total,{expanded=false}={}){
 const query=cleanQuery(q);if(!query)return;
 const day=dayKey(),path=analyticsDayPath(day);
 try{
  const doc=await readJson(path,{day,updatedAt:null,queries:{}},{ttlMs:0});
  const k=query.toLowerCase(),prev=doc.queries?.[k]||{query,count:0,zeroCount:0,expandedCount:0,totalResultSum:0,lastTotal:0};
  doc.queries={...(doc.queries||{}),[k]:{query:prev.query||query,count:Number(prev.count||0)+1,zeroCount:Number(prev.zeroCount||0)+(Number(total||0)===0?1:0),expandedCount:Number(prev.expandedCount||0)+(expanded?1:0),totalResultSum:Number(prev.totalResultSum||0)+Number(total||0),lastTotal:Number(total||0),lastExpanded:!!expanded,lastAt:new Date().toISOString()}};
  doc.updatedAt=new Date().toISOString();await writeJson(path,doc);
 }catch{}
}
export async function readAnalytics(days=30){
 const out=new Map(),now=new Date();const paths=[];
 for(let i=0;i<days;i++){const d=new Date(now);d.setUTCDate(d.getUTCDate()-i);paths.push(analyticsDayPath(dayKey(d)));}
 const docs=await Promise.all(paths.map(p=>readJson(p,null,{ttlMs:60*1000})));
 for(const doc of docs){for(const v of Object.values(doc?.queries||{})){const k=String(v.query||'').toLowerCase();const x=out.get(k)||{query:v.query||k,count:0,zeroCount:0,expandedCount:0,totalResultSum:0,lastTotal:0,lastExpanded:false,lastAt:null};x.count+=Number(v.count||0);x.zeroCount+=Number(v.zeroCount||0);x.expandedCount+=Number(v.expandedCount||0);x.totalResultSum+=Number(v.totalResultSum||0);if(!x.lastAt||String(v.lastAt||'')>x.lastAt){x.lastAt=v.lastAt||null;x.lastTotal=Number(v.lastTotal||0);x.lastExpanded=!!v.lastExpanded;}out.set(k,x);}}
 return [...out.values()].map(x=>({...x,avgResults:x.count?Math.round((x.totalResultSum/x.count)*10)/10:0})).sort((a,b)=>b.count-a.count||a.query.localeCompare(b.query,'ko'));
}
