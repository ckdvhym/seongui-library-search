import { readJson,PATHS } from '../storage.mjs';
import { interpretLocal,scoreRecord } from '../profile.mjs';

async function geminiIntent(q,base){
 const key=process.env.GEMINI_API_KEY;if(!key||!base.complex)return base;
 // 정확한 제목/저자형 검색은 로컬 인덱스가 더 빠르고 안정적이므로 AI를 호출하지 않는다.
 if(base.directLookup)return base;
 try{
  const prompt=`학교도서관 자연어 검색어에서 '부드러운 의미 확장'만 추출하라. 특히 학과·전공·진학·연계 질문이면 학과명 자체가 아니라 그 전공에서 실제로 다루는 핵심 학문 개념을 softKeywords로 풀어라. '관련/연계/진학/학과/전공'은 주제가 아니라 검색 목적 표현이다. 명시되지 않은 국가/문학권/자료형/장르/고전 여부를 새 필수조건으로 만들지 마라. 책을 추천하지 말고 JSON만 반환한다. softTopics는 환경·기후,인공지능·정보,수학,과학,의학·약학,건축·도시,역사,철학·윤리,사회·정치,심리·감정,진로·직업,예술·디자인,문학·글쓰기,여행·지리,경제·경영,스포츠 중 관련된 것을 최대 3개. softKeywords는 검색 의미를 넓히는 명사/개념 최대 8개. 형식 {"softTopics":[],"softKeywords":[]}\n검색어: ${q}`;
  const u=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key)}`;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),2200);let r;try{r=await fetch(u,{method:'POST',signal:ctrl.signal,headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}})});}finally{clearTimeout(timer);}if(!r.ok)return base;const j=await r.json();const text=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return base;const x=JSON.parse(text);
  return {...base,softTopics:[...new Set(x.softTopics||[])].slice(0,3),softKeywords:[...new Set(x.softKeywords||[])].slice(0,8),aiInterpreted:true};
 }catch{return base;}
}
function fitLabel(score){return score>=35?'매우 적합':score>=23?'적합':'관련 있음';}
export async function runSearch(q,idx,{useAI=true,offset=0,limit=12}={}){
 let intent=interpretLocal(q);
 // 이미 로컬에서 전공을 정확히 식별한 학과 검색은 Gemini를 호출하지 않는다.
 // 속도를 지키고 같은 전공 표현(관련/연계/진학)의 결과 흔들림을 줄인다.
 if(useAI&&!intent.majorArea&&!(intent.focus||[]).length)intent=await geminiIntent(q,intent);const hits=[];
 for(const r of idx.records){const s=scoreRecord(r,intent);if(s)hits.push({...r,_score:s.score,_reasons:s.reasons});}
 hits.sort((a,b)=>b._score-a._score||String(b.year).localeCompare(String(a.year)));
 const total=hits.length;const results=hits.slice(offset,offset+limit).map(r=>({id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres,literatureOrigin:r.literatureOrigin,fit:fitLabel(r._score),reasons:r._reasons,score:Math.round(r._score*10)/10}));
 return {intent,results,total,hasMore:offset+results.length<total,nextOffset:offset+results.length};
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});const q=String(req.query?.q||'').trim();if(!q)return res.status(400).json({ok:false,message:'검색어를 입력해 주세요.'});
 const offset=Math.max(0,Number(req.query?.offset||0)||0),limit=Math.min(24,Math.max(1,Number(req.query?.limit||12)||12));
 try{const idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});if(!idx?.records)return res.status(503).json({ok:false,message:'아직 검색 인덱스가 준비되지 않았습니다. 관리자에서 통합 구축을 먼저 실행해 주세요.'});const {intent,results,total,hasMore,nextOffset}=await runSearch(q,idx,{useAI:true,offset,limit});res.status(200).json({ok:true,version:idx.version||'unknown',query:q,intent:{majorIntent:!!intent.majorIntent,majorArea:intent.majorArea||null,material:intent.material,genres:intent.genres,topics:intent.topics,emotions:intent.emotions,origin:intent.origin,classicRequired:intent.classicRequired,classicTarget:intent.classicTarget||null,philosophyTradition:intent.philosophyTradition,requiredTerms:intent.requiredTerms,explicitConcepts:(intent.explicitConcepts||[]).map(x=>x.name),compoundConcepts:!!intent.compoundConcepts,aiInterpreted:!!intent.aiInterpreted},count:results.length,total,hasMore,nextOffset,results});}catch(e){res.status(500).json({ok:false,message:'검색 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
