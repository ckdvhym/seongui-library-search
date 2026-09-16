import {del} from '@vercel/blob';
import {requireAdmin} from '../admin-auth.mjs';
import {readAnalytics,readAnalyticsRange,dayKey} from '../analytics.mjs';
import {analyticsDayPath} from '../storage.mjs';
function validDate(x){return /^\d{4}-\d{2}-\d{2}$/.test(String(x||''));}
function rangeDates(a,b){const out=[],x=new Date(a+'T00:00:00Z'),y=new Date(b+'T00:00:00Z');for(let d=new Date(x);d<=y&&out.length<366;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out;}
export default async function handler(req,res){if(!requireAdmin(req,res))return;try{
 if(req.method==='POST'&&String(req.query?.action||'')==='reset'){const end=dayKey(),d=new Date();d.setFullYear(d.getFullYear()-1);const start=dayKey(d);await Promise.all(rangeDates(start,end).map(p=>del(analyticsDayPath(p)).catch(()=>{})));return res.status(200).json({ok:true,message:'테스트 검색 기록을 초기화했습니다.',startedAt:new Date().toISOString()});}
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET/POST only'});const start=validDate(req.query?.start)?String(req.query.start):null,end=validDate(req.query?.end)?String(req.query.end):null;const days=Math.min(365,Math.max(1,Number(req.query?.days||30)||30));const rows=start&&end?await readAnalyticsRange(start,end):await readAnalytics(days);return res.status(200).json({ok:true,start,end,days,totalQueries:rows.reduce((s,x)=>s+x.count,0),uniqueQueries:rows.length,rows,top:rows.slice(0,20),failures:rows.filter(x=>x.zeroCount>0),gaps:rows.filter(x=>x.count>=2&&x.avgResults<=5)});
 }catch(e){return res.status(500).json({ok:false,message:'검색 기록을 읽지 못했습니다.',detail:String(e?.message||e)});}}
