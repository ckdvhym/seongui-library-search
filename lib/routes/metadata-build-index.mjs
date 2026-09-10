import { requireAdmin } from '../admin-auth.mjs';
import { readJson,writeJson,PATHS,chunkPath,searchChunkPath } from '../storage.mjs';
import { deriveProfile,interpretLocal,scoreRecord,auditRecordAgainstIntent } from '../profile.mjs';
const META_BATCH=80;
const BUILD_BATCH=300;

function audit(records){
 const cases=['중국 소설','기후 위기와 관련된 한국 소설','서양 철학','동양 철학','고전 소설','고전 한국 문학','돈 관련 책','재테크 관련 책','연산군','프랑스 전쟁','인생에 대해 돌아볼 수 있는 책','인공지능과 환경 오염','유전공학과 윤리','자유주의와 경제 격차','수의사 관련 책','생명공학 진로 책'];
 const out=[];
 for(const q of cases){
  const intent=interpretLocal(q),hits=[];
  for(const r of records){const s=scoreRecord(r,intent);if(s)hits.push({...r,_score:s.score});}
  hits.sort((a,b)=>b._score-a._score);
  const top=hits.slice(0,12),violations=top.flatMap(r=>auditRecordAgainstIntent(r,intent).map(p=>`${r.title}:${p}`));
  out.push({query:q,count:top.length,violations:violations.slice(0,10),status:violations.length?'warning':(top.length?'ok':'no_result')});
 }
 return out;
}

async function loadMetaMap(start,end){
 const meta=new Map();
 const first=Math.floor(start/META_BATCH), last=Math.floor((Math.max(start,end-1))/META_BATCH);
 for(let c=first;c<=last;c++){const x=await readJson(chunkPath(c),null);for(const r of x?.records||[])meta.set(r.id,r);}
 return meta;
}

function makeRecord(b,idx,m){
 const intro=m?.yes24?.introduction||'',toc=m?.yes24?.toc||'',prof=deriveProfile(b,{introduction:intro,toc});
 return {id:b.id,chunk:Math.floor(idx/META_BATCH),title:b.identity?.title||'',author:b.identity?.author||'',publisher:b.identity?.publisher||'',year:b.identity?.year||'',isbn13:b.identity?.isbn13||'',copies:b.holding?.copies||1,callNumbers:b.holding?.callNumbers||[],locations:b.holding?.locations||[],kdc:b.holding?.kdc||'',materialType:prof.materialType||null,materialTypes:prof.materialTypes||[],genres:prof.genres||[],primaryTopics:prof.primaryTopics||[],secondaryTopics:prof.secondaryTopics||[],topics:prof.topics||[],topicEvidence:prof.topicEvidence||{},emotions:prof.emotions||[],literatureOrigin:prof.literatureOrigin||null,originScores:prof.originScores||{},philosophyScores:prof.philosophyScores||{},classicScore:prof.classicScore||0,classicMeta:!!prof.classicMeta,keywords:prof.keywords||[],tocTokens:prof.tocTokens||[],cover:m?.yes24?.cover||null,introPreview:intro.slice(0,700),metadataStatus:m?.yes24?.status||'base'};
}

export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});
 if(!requireAdmin(req,res))return;
 const action=String(req.query?.action||'step');
 try{
  const catalog=await readJson(PATHS.catalog);const p=await readJson(PATHS.metaState,{});
  if(!catalog?.books?.length)throw new Error('기본 카탈로그가 없습니다.');
  const total=catalog.books.length;

  if(action==='reset'){
   await writeJson(PATHS.searchBuildState,{version:'V7.5',processed:0,total,completed:false,startedAt:new Date().toISOString()});
   return res.status(200).json({ok:true,processed:0,total,completed:false,message:'검색 인덱스 재구축을 시작합니다.'});
  }

  if(action==='step'){
   let st=await readJson(PATHS.searchBuildState,{version:'V7.5',processed:0,total,completed:false});
   if(st.version!=='V7.5'||st.total!==total){st={version:'V7.5',processed:0,total,completed:false,startedAt:new Date().toISOString()};}
   if(st.processed>=total)return res.status(200).json({ok:true,processed:total,total,completed:true,message:'검색 인덱스용 데이터 처리가 완료되었습니다.'});
   const start=st.processed,end=Math.min(total,start+BUILD_BATCH),meta=await loadMetaMap(start,end),records=[];
   for(let idx=start;idx<end;idx++){const b=catalog.books[idx],m=meta.get(b.id);records.push(makeRecord(b,idx,m));}
   const part=Math.floor(start/BUILD_BATCH);
   await writeJson(searchChunkPath(part),{version:'V7.5',part,start,end,records});
   st={...st,processed:end,total,completed:end>=total,updatedAt:new Date().toISOString()};
   await writeJson(PATHS.searchBuildState,st);
   return res.status(200).json({ok:true,processed:end,total,completed:st.completed,part,message:`검색 인덱스 준비 ${end.toLocaleString()} / ${total.toLocaleString()}종`});
  }

  if(action==='finalize'){
   const st=await readJson(PATHS.searchBuildState,null);
   if(!st||st.processed<total)return res.status(409).json({ok:false,message:'아직 검색 인덱스용 데이터 처리가 끝나지 않았습니다.',processed:st?.processed||0,total});
   const parts=Math.ceil(total/BUILD_BATCH),records=[];
   for(let i=0;i<parts;i++){const x=await readJson(searchChunkPath(i),null);if(!x?.records)throw new Error(`검색 인덱스 조각 ${i}를 찾을 수 없습니다.`);records.push(...x.records);}
   const qualityAudit=audit(records),auditSummary={checked:qualityAudit.length,warnings:qualityAudit.filter(x=>x.status==='warning').length,noResult:qualityAudit.filter(x=>x.status==='no_result').length,cases:qualityAudit};
   await writeJson(PATHS.searchIndex,{version:'V7.5',builtAt:new Date().toISOString(),schoolId:catalog.schoolId||'seongui-high',bookCount:records.length,metadataProcessed:p.processed||0,audit:auditSummary,records});
   const state=await readJson(PATHS.state,{});state.search={ready:true,builtAt:new Date().toISOString(),bookCount:records.length,metadataProcessed:p.processed||0,version:'V7.5',audit:auditSummary};await writeJson(PATHS.state,state);
   await writeJson(PATHS.searchBuildState,{...st,finalized:true,finalizedAt:new Date().toISOString()});
   return res.status(200).json({ok:true,version:'V7.5',bookCount:records.length,audit:auditSummary,message:`검색 인덱스 ${records.length.toLocaleString()}종을 V7.5 기준으로 재구축했습니다.`});
  }

  res.status(400).json({ok:false,message:'알 수 없는 작업입니다.',action});
 }catch(e){res.status(500).json({ok:false,message:'검색 인덱스 구축 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)});}
}
