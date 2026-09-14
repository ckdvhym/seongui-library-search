import { readJson, writeJson, PATHS } from '../storage.mjs';
import { requireAdmin } from '../admin-auth.mjs';

const DEFAULTS={schoolName:'성의고등학교 도서관',logoDataUrl:''};
function safeSettings(v={}){
  return {
    schoolName:String(v.schoolName||DEFAULTS.schoolName).slice(0,80),
    logoDataUrl:/^data:image\/(png|jpeg|webp);base64,/i.test(String(v.logoDataUrl||''))?String(v.logoDataUrl):''
  };
}
export default async function handler(req,res){
  if(req.method==='GET'){
    const current=await readJson(PATHS.schoolSettings,DEFAULTS,{ttlMs:5*60*1000});
    return res.status(200).json({ok:true,...safeSettings(current)});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});
  if(!requireAdmin(req,res))return;
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const prev=await readJson(PATHS.schoolSettings,DEFAULTS);
    const next=safeSettings({...prev,...body});
    if(next.logoDataUrl.length>280000)return res.status(413).json({ok:false,message:'로고 이미지가 너무 큽니다. 200KB 이하의 PNG/JPG/WebP 이미지를 사용해 주세요.'});
    await writeJson(PATHS.schoolSettings,next);
    return res.status(200).json({ok:true,message:next.logoDataUrl?'학교 로고를 저장했습니다.':'학교 로고를 사용하지 않도록 저장했습니다.',...next});
  }catch(e){return res.status(500).json({ok:false,message:'학교 설정 저장 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
