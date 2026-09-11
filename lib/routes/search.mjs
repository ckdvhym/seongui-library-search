import { readJson,PATHS } from '../storage.mjs';
import { interpretLocal,scoreRecord,norm } from '../profile.mjs';

const INTENT_CACHE=new Map();
function cacheKey(q){return String(q||'').toLowerCase().replace(/\s+/g,' ').trim();}
function getCached(q){const k=cacheKey(q),v=INTENT_CACHE.get(k);if(!v)return null;if(Date.now()-v.at>15*60*1000){INTENT_CACHE.delete(k);return null;}return v.value;}
function setCached(q,value){const k=cacheKey(q);INTENT_CACHE.set(k,{at:Date.now(),value});if(INTENT_CACHE.size>120)INTENT_CACHE.delete(INTENT_CACHE.keys().next().value);}
function hasExactIdentity(q,idx){const nq=norm(q);if(!nq)return false;return (idx.records||[]).some(r=>norm(r.title)===nq||norm(r.author)===nq||norm(r.author).startsWith(nq+'지음')||norm(r.author).startsWith(nq+'저'));}
function shouldSemanticExpand(base){
 const alreadyUnderstood=!!(base.majorArea||(base.focus||[]).length||(base.topics||[]).length||(base.genres||[]).length||(base.emotions||[]).length||base.origin||base.classicRequired||base.philosophyTradition||(base.explicitConcepts||[]).length);
 if(alreadyUnderstood)return false;
 // 자료형만 인식되고 다른 의미가 남은 경우도 짧은 검색이면 AI가 보조할 수 있다.
 return (base.tokens||[]).length>=1&&(base.tokens||[]).length<=4;
}
async function geminiIntent(q,base,{forceSemantic=false}={}){
 const key=process.env.GEMINI_API_KEY;if(!key||(!base.complex&&!forceSemantic))return base;
 if(base.directLookup&&!forceSemantic)return base;
 const cached=getCached(q);if(cached)return {...base,...cached,aiInterpreted:true};
 try{
  const prompt=`학교도서관 검색어의 의미를 해석하라. 책을 추천하지 말고 검색어 자체의 의미만 JSON으로 반환한다.\n
규칙:\n
1) 사용자가 직접 말하지 않은 국가·자료형·장르를 필수조건으로 만들지 않는다.\n
2) coreKeywords는 동의어·대표 인물·대표 개념처럼 '강하게 연결되는 말'만 최대 7개. 너무 넓은 상위어는 넣지 않는다.\n
3) contextKeywords는 함께 나오면 관련성을 높여주는 주변 맥락 최대 6개.\n
4) semanticKind는 topic, entity, genre, mood, other 중 하나.\n
5) 예: 나치 → coreKeywords에 나치즘, 히틀러, 제3제국, 홀로코스트 등. 유교 → 공자, 논어, 맹자, 유학, 성리학 등. '성당'은 가톨릭/천주교 맥락을 연결하되 제목에 우연히 '대성당'이 들어간 소설을 뜻하지는 않는다.\n
6) softTopics는 환경·기후,인공지능·정보,수학,과학,의학·약학,건축·도시,역사,철학·윤리,사회·정치,심리·감정,진로·직업,예술·디자인,문학·글쓰기,여행·지리,경제·경영,스포츠 중 최대 3개.\n
형식 {"semanticKind":"topic","coreKeywords":[],"contextKeywords":[],"softTopics":[],"softKeywords":[]}\n검색어: ${q}`;
  const u=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key)}`;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),2200);let r;try{r=await fetch(u,{method:'POST',signal:ctrl.signal,headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.05,responseMimeType:'application/json'}})});}finally{clearTimeout(timer);}if(!r.ok)return base;const j=await r.json();const text=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return base;const x=JSON.parse(text);
  const patch={softTopics:[...new Set(x.softTopics||[])].slice(0,3),softKeywords:[...new Set(x.softKeywords||[])].slice(0,8),semanticKind:String(x.semanticKind||'other'),semanticCoreKeywords:[...new Set(x.coreKeywords||[])].slice(0,7),semanticContextKeywords:[...new Set(x.contextKeywords||[])].slice(0,6),semanticFallback:!!forceSemantic};
  setCached(q,patch);return {...base,...patch,aiInterpreted:true};
 }catch{return base;}
}
function fitLabel(score){return score>=35?'매우 적합':score>=23?'적합':'관련 있음';}
export async function runSearch(q,idx,{useAI=true,offset=0,limit=12}={}){
 let intent=interpretLocal(q);
 const exact=hasExactIdentity(q,idx),semanticFallback=!exact&&shouldSemanticExpand(intent);
 // 기존에 잘 되던 로컬 검색은 그대로 둔다. 로컬 규칙이 해석하지 못한 짧은 개념만 Gemini 의미 확장을 사용한다.
 if(useAI&&!intent.majorArea&&!(intent.focus||[]).length&&!exact&&(intent.complex||semanticFallback))intent=await geminiIntent(q,intent,{forceSemantic:semanticFallback});
 const hits=[];
 for(const r of idx.records){const s=scoreRecord(r,intent);if(s)hits.push({...r,_score:s.score,_reasons:s.reasons});}
 hits.sort((a,b)=>b._score-a._score||String(b.year).localeCompare(String(a.year)));
 const total=hits.length;const results=hits.slice(offset,offset+limit).map(r=>({id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres,literatureOrigin:r.literatureOrigin,fit:fitLabel(r._score),reasons:r._reasons,score:Math.round(r._score*10)/10}));
 return {intent,results,total,hasMore:offset+results.length<total,nextOffset:offset+results.length};
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});const q=String(req.query?.q||'').trim();if(!q)return res.status(400).json({ok:false,message:'검색어를 입력해 주세요.'});
 const offset=Math.max(0,Number(req.query?.offset||0)||0),limit=Math.min(24,Math.max(1,Number(req.query?.limit||12)||12));
 try{const idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});if(!idx?.records)return res.status(503).json({ok:false,message:'아직 검색 인덱스가 준비되지 않았습니다. 관리자에서 통합 구축을 먼저 실행해 주세요.'});const {intent,results,total,hasMore,nextOffset}=await runSearch(q,idx,{useAI:true,offset,limit});res.status(200).json({ok:true,version:idx.version||'unknown',query:q,intent:{majorIntent:!!intent.majorIntent,majorArea:intent.majorArea||null,material:intent.material,genres:intent.genres,topics:intent.topics,emotions:intent.emotions,origin:intent.origin,classicRequired:intent.classicRequired,classicTarget:intent.classicTarget||null,philosophyTradition:intent.philosophyTradition,requiredTerms:intent.requiredTerms,explicitConcepts:(intent.explicitConcepts||[]).map(x=>x.name),compoundConcepts:!!intent.compoundConcepts,aiInterpreted:!!intent.aiInterpreted,semanticKind:intent.semanticKind||null,semanticCoreKeywords:intent.semanticCoreKeywords||[]},count:results.length,total,hasMore,nextOffset,results});}catch(e){res.status(500).json({ok:false,message:'검색 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
