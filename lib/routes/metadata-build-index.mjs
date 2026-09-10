import { requireAdmin } from '../admin-auth.mjs';
import { readJson,writeJson,PATHS,chunkPath } from '../storage.mjs';
import { deriveProfile } from '../profile.mjs';
const BATCH=80;
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});if(!requireAdmin(req,res))return;
 try{
  const catalog=await readJson(PATHS.catalog);const p=await readJson(PATHS.metaState,{});if(!catalog?.books?.length)throw new Error('기본 카탈로그가 없습니다.');
  const meta=new Map();const chunks=Math.ceil(Math.min(p.processed||0,catalog.books.length)/BATCH);
  for(let c=0;c<chunks;c++){const x=await readJson(chunkPath(c),null);for(const r of x?.records||[])meta.set(r.id,r);}
  const records=catalog.books.map((b,idx)=>{
    const m=meta.get(b.id);
    // 저장된 YES24 원문으로 프로필을 다시 계산하므로 외부 API를 다시 호출하지 않아도 검색 로직을 개선할 수 있다.
    const prof=deriveProfile(b,{introduction:m?.yes24?.introduction||'',toc:m?.yes24?.toc||''});
    return {id:b.id,chunk:Math.floor(idx/BATCH),title:b.identity?.title||'',author:b.identity?.author||'',publisher:b.identity?.publisher||'',year:b.identity?.year||'',isbn13:b.identity?.isbn13||'',copies:b.holding?.copies||1,callNumbers:b.holding?.callNumbers||[],locations:b.holding?.locations||[],kdc:b.holding?.kdc||'',materialType:prof.materialType||null,genres:prof.genres||[],primaryTopics:prof.primaryTopics||[],secondaryTopics:prof.secondaryTopics||[],topics:prof.topics||[],topicEvidence:prof.topicEvidence||{},emotions:prof.emotions||[],literatureOrigin:prof.literatureOrigin||null,classicScore:prof.classicScore||0,keywords:prof.keywords||[],cover:m?.yes24?.cover||null,introPreview:(m?.yes24?.introduction||'').slice(0,500),metadataStatus:m?.yes24?.status||'base'};
  });
  await writeJson(PATHS.searchIndex,{version:'V6.3',builtAt:new Date().toISOString(),schoolId:catalog.schoolId||'seongui-high',bookCount:records.length,metadataProcessed:p.processed||0,records});
  const state=await readJson(PATHS.state,{});state.search={ready:true,builtAt:new Date().toISOString(),bookCount:records.length,metadataProcessed:p.processed||0,version:'V6.3'};await writeJson(PATHS.state,state);
  res.status(200).json({ok:true,version:'V6.3',bookCount:records.length,metadataProcessed:p.processed||0,complete:(p.processed||0)>=catalog.books.length,message:`검색 인덱스 ${records.length.toLocaleString()}종을 V6.3 기준으로 재구축했습니다.`});
 }catch(e){res.status(500).json({ok:false,message:'검색 인덱스 구축 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)});}
}
