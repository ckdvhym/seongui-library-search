import { requireAdmin } from '../admin-auth.mjs';
import { readJson,PATHS } from '../storage.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET 요청만 허용됩니다.'});
 if(!requireAdmin(req,res))return;
 try{
  const catalog=await readJson(PATHS.catalog); const p=await readJson(PATHS.metaState,{}); const state=await readJson(PATHS.state,{});
  const total=catalog?.books?.length||0, processed=Math.min(Number(p.processed||0),total);
  res.status(200).json({ok:true,version:'V6.0',total,processed,remaining:Math.max(0,total-processed),completed:total>0&&processed>=total,yes24Found:p.yes24Found||0,yes24Missing:p.yes24Missing||0,nlkFallbackFound:p.nlkFallbackFound||0,errors:p.errors||0,lastUpdatedAt:p.lastUpdatedAt||null,indexReady:!!state?.search?.ready,indexBuiltAt:state?.search?.builtAt||null});
 }catch(e){res.status(500).json({ok:false,message:'메타데이터 상태 확인 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
