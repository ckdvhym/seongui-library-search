import {requireAdmin} from '../admin-auth.mjs';
import {readAnalytics} from '../analytics.mjs';
import {writeJson,PATHS,analyticsDayPath} from '../storage.mjs';
import {addHistory} from '../history.mjs';
function today(){return new Date().toISOString().slice(0,10);}
export default async function handler(req,res){
 if(!requireAdmin(req,res))return;
 try{
  if(req.method==='POST'){
   const action=String(req.query?.action||'');if(action!=='reset')return res.status(400).json({ok:false,message:'알 수 없는 작업입니다.'});
   const startDate=today(),resetAt=new Date().toISOString();await writeJson(PATHS.analyticsControl,{version:'V9.0',startDate,resetAt});await writeJson(analyticsDayPath(startDate),{day:startDate,updatedAt:resetAt,queries:{}});await addHistory('analytics','검색 이용 기록 초기화',{startDate});return res.status(200).json({ok:true,message:'검색 이용 기록을 초기화했습니다. 이제부터의 검색만 집계합니다.',startDate});
  }
  if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET/POST only'});
  const days=Math.min(90,Math.max(7,Number(req.query?.days||30)||30));const from=String(req.query?.from||''),to=String(req.query?.to||''),sort=String(req.query?.sort||'count');
  const control=await (await import('../storage.mjs')).readJson(PATHS.analyticsControl,{startDate:'',resetAt:null},{ttlMs:30*1000});
  let rows=await readAnalytics(days,{startDate:control.startDate||'',from,to});
  if(sort==='recent')rows.sort((a,b)=>String(b.lastAt||'').localeCompare(String(a.lastAt||''))||b.count-a.count);
  else if(sort==='low')rows.sort((a,b)=>a.lastTotal-b.lastTotal||b.count-a.count||String(b.lastAt||'').localeCompare(String(a.lastAt||'')));
  else rows.sort((a,b)=>b.count-a.count||String(b.lastAt||'').localeCompare(String(a.lastAt||'')));
  const failures=rows.filter(x=>x.zeroCount>0),low=rows.filter(x=>x.lastTotal>0&&x.avgResults<=3),gaps=rows.filter(x=>x.count>=2&&x.avgResults<=5);
  return res.status(200).json({ok:true,days,from,to,sort,startDate:control.startDate||'',resetAt:control.resetAt||null,totalQueries:rows.reduce((s,x)=>s+x.count,0),uniqueQueries:rows.length,rows:rows.slice(0,100),top:rows.slice(0,20),failures,low,gaps});
 }catch(e){return res.status(500).json({ok:false,message:'검색 통계를 처리하지 못했습니다.',detail:String(e?.message||e)});}
}
