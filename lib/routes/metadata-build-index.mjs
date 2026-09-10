import { requireAdmin } from '../admin-auth.mjs';
import { readJson,writeJson,PATHS,chunkPath } from '../storage.mjs';
import { deriveProfile,interpretLocal,scoreRecord,auditRecordAgainstIntent } from '../profile.mjs';
const BATCH=80;

function audit(records){
 const cases=['중국 소설','기후 위기와 관련된 한국 소설','서양 철학','동양 철학','고전 소설','돈 관련 책','재테크 관련 책','연산군','프랑스 전쟁','인생에 대해 돌아볼 수 있는 책'];
 const out=[];
 for(const q of cases){const intent=interpretLocal(q),hits=[];for(const r of records){const s=scoreRecord(r,intent);if(s)hits.push({...r,_score:s.score});}hits.sort((a,b)=>b._score-a._score);const top=hits.slice(0,12),violations=top.flatMap(r=>auditRecordAgainstIntent(r,intent).map(p=>`${r.title}:${p}`));out.push({query:q,count:top.length,violations:violations.slice(0,10),status:violations.length?'warning':(top.length?'ok':'no_result')});}
 return out;
}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});if(!requireAdmin(req,res))return;
 try{
  const catalog=await readJson(PATHS.catalog);const p=await readJson(PATHS.metaState,{});if(!catalog?.books?.length)throw new Error('기본 카탈로그가 없습니다.');
  const meta=new Map();const chunks=Math.ceil(Math.min(p.processed||0,catalog.books.length)/BATCH);for(let c=0;c<chunks;c++){const x=await readJson(chunkPath(c),null);for(const r of x?.records||[])meta.set(r.id,r);}
  const records=catalog.books.map((b,idx)=>{const m=meta.get(b.id),intro=m?.yes24?.introduction||'',toc=m?.yes24?.toc||'',prof=deriveProfile(b,{introduction:intro,toc});return {id:b.id,chunk:Math.floor(idx/BATCH),title:b.identity?.title||'',author:b.identity?.author||'',publisher:b.identity?.publisher||'',year:b.identity?.year||'',isbn13:b.identity?.isbn13||'',copies:b.holding?.copies||1,callNumbers:b.holding?.callNumbers||[],locations:b.holding?.locations||[],kdc:b.holding?.kdc||'',materialType:prof.materialType||null,materialTypes:prof.materialTypes||[],genres:prof.genres||[],primaryTopics:prof.primaryTopics||[],secondaryTopics:prof.secondaryTopics||[],topics:prof.topics||[],topicEvidence:prof.topicEvidence||{},emotions:prof.emotions||[],literatureOrigin:prof.literatureOrigin||null,originScores:prof.originScores||{},philosophyScores:prof.philosophyScores||{},classicScore:prof.classicScore||0,keywords:prof.keywords||[],tocTokens:prof.tocTokens||[],cover:m?.yes24?.cover||null,introPreview:intro.slice(0,700),metadataStatus:m?.yes24?.status||'base'};});
  const qualityAudit=audit(records);const auditSummary={checked:qualityAudit.length,warnings:qualityAudit.filter(x=>x.status==='warning').length,noResult:qualityAudit.filter(x=>x.status==='no_result').length,cases:qualityAudit};
  await writeJson(PATHS.searchIndex,{version:'V7.0',builtAt:new Date().toISOString(),schoolId:catalog.schoolId||'seongui-high',bookCount:records.length,metadataProcessed:p.processed||0,audit:auditSummary,records});
  const state=await readJson(PATHS.state,{});state.search={ready:true,builtAt:new Date().toISOString(),bookCount:records.length,metadataProcessed:p.processed||0,version:'V7.0',audit:auditSummary};await writeJson(PATHS.state,state);
  res.status(200).json({ok:true,version:'V7.0',bookCount:records.length,metadataProcessed:p.processed||0,complete:(p.processed||0)>=catalog.books.length,audit:auditSummary,message:`검색 인덱스 ${records.length.toLocaleString()}종을 V7.0 기준으로 재구축했습니다. 자동 회귀점검 ${auditSummary.checked}개 검색어도 함께 실행했습니다.`});
 }catch(e){res.status(500).json({ok:false,message:'검색 인덱스 구축 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)});}
}
