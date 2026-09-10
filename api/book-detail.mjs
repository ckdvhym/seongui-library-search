import { readJson,chunkPath } from './_storage.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});
 try{const id=String(req.query?.id||''),chunk=Number(req.query?.chunk);if(!id||!Number.isInteger(chunk)||chunk<0)return res.status(400).json({ok:false,message:'잘못된 요청입니다.'});const x=await readJson(chunkPath(chunk),null);const r=x?.records?.find(v=>v.id===id);if(!r)return res.status(404).json({ok:false,message:'추가 메타데이터가 아직 없습니다.'});res.status(200).json({ok:true,introduction:r.yes24?.introduction||'',toc:r.yes24?.toc||'',summary:r.yes24?.summary||'',cover:r.yes24?.cover||null,sourceLink:r.yes24?.link||null,topics:r.profile?.topics||[],genres:r.profile?.genres||[],emotions:r.profile?.emotions||[]});}catch(e){res.status(500).json({ok:false,message:'상세정보를 읽지 못했습니다.'});}
}
