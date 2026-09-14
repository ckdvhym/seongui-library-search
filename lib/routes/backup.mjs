import JSZip from 'jszip';
import {requireAdmin} from '../admin-auth.mjs';
import {readJson,writeJson,PATHS} from '../storage.mjs';
import {addHistory} from '../history.mjs';
const FILES={
 'school-settings.json':PATHS.schoolSettings,
 'recommendations.json':PATHS.recommendations,
 'acquisition-box.json':PATHS.acquisitionBox,
 'change-history.json':PATHS.changeHistory,
 'catalog-imports.json':PATHS.catalogImports
};
async function bodyBuffer(req){if(Buffer.isBuffer(req.body))return req.body;if(req.body instanceof Uint8Array)return Buffer.from(req.body);if(typeof req.body==='string')return Buffer.from(req.body,'binary');const chunks=[];for await(const c of req)chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));return Buffer.concat(chunks);}
export default async function handler(req,res){
 if(!requireAdmin(req,res))return;
 try{
  if(req.method==='GET'){
   const zip=new JSZip();zip.file('README.txt','학교도서관 자료탐색 V9.0 관리자 백업\nAPI 키와 장서/검색 인덱스는 포함하지 않습니다.\n');
   for(const [name,path] of Object.entries(FILES)){const data=await readJson(path,null);if(data!==null)zip.file(name,JSON.stringify(data,null,2));}
   const buf=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition','attachment; filename="library-admin-backup-v9.zip"');return res.status(200).send(buf);
  }
  if(req.method==='POST'){
   const buf=await bodyBuffer(req);if(!buf.length||buf.length>3_000_000)return res.status(400).json({ok:false,message:'백업 ZIP 파일을 확인해 주세요.'});const zip=await JSZip.loadAsync(buf);const restored=[];
   for(const [name,path] of Object.entries(FILES)){const f=zip.file(name);if(!f)continue;const data=JSON.parse(await f.async('string'));await writeJson(path,data);restored.push(name);}
   await addHistory('backup','관리자 백업 복원',{files:restored});return res.status(200).json({ok:true,message:`백업에서 ${restored.length}개 설정 파일을 복원했습니다.`,restored});
  }
  return res.status(405).json({ok:false,message:'GET/POST only'});
 }catch(e){return res.status(500).json({ok:false,message:'백업 처리 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
