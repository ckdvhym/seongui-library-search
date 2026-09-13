import {requireAdmin} from '../admin-auth.mjs';
import {readAnalytics} from '../analytics.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});if(!requireAdmin(req,res))return;
 try{const days=Math.min(90,Math.max(7,Number(req.query?.days||30)||30));const rows=await readAnalytics(days);const top=rows.slice(0,20),failures=rows.filter(x=>x.zeroCount>0).sort((a,b)=>b.zeroCount-a.zeroCount||b.count-a.count).slice(0,20);const gaps=rows.filter(x=>x.count>=2&&x.avgResults<=5).sort((a,b)=>b.count-a.count||a.avgResults-b.avgResults).slice(0,20);return res.status(200).json({ok:true,days,totalQueries:rows.reduce((s,x)=>s+x.count,0),uniqueQueries:rows.length,top,failures,gaps});}catch(e){return res.status(500).json({ok:false,message:'검색 통계를 읽지 못했습니다.',detail:String(e?.message||e)});}
}
