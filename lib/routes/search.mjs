import { readJson,PATHS } from '../storage.mjs';
import { interpretLocal,scoreRecord,norm } from '../profile.mjs';

const INTENT_CACHE=new Map();
const SUGGEST_CACHE=new Map();
const SUGGEST_TOPIC_QUERY={'환경·기후':'환경과 기후','인공지능·정보':'인공지능','수학':'수학','과학':'과학','의학·약학':'의학과 약학','건축·도시':'건축과 도시','역사':'역사','철학·윤리':'철학과 윤리','사회·정치':'사회 문제','심리·감정':'심리','진로·직업':'진로와 직업','예술·디자인':'예술과 디자인','문학·글쓰기':'문학과 글쓰기','여행·지리':'여행과 지리','경제·경영':'경제와 경영','스포츠':'스포츠'};
const SUGGEST_GENRE_QUERY={'로맨스':'로맨스','추리':'추리 소설','미스터리':'미스터리 소설','SF':'SF 소설','판타지':'판타지 소설','고전':'고전 소설','시':'시집','에세이':'에세이','소설':'소설'};
const CURATED_REFINEMENTS={
 '약학':['약학 진로','신약 개발','의약품','생명공학'],
 '의학·약학':['의약품','신약 개발','생명공학과 윤리'],
 '인공지능·정보':['AI 윤리','생성형 AI','AI와 직업','인공지능 소설'],
 '환경·기후':['기후 위기','탄소중립','환경 관련 소설','생물다양성'],
 '건축·도시':['건축 진로','도시와 건축','친환경 건축','건축 디자인'],
 '심리·감정':['심리학','감정','관계','범죄심리'],
 '경제·경영':['경제','경영','경제 격차','금융'],
 '철학·윤리':['윤리','동양철학','서양철학','삶과 철학'],
 '사회·정치':['사회 문제','불평등','민주주의','인권'],
 '과학':['생명과학','물리학','화학','천문학'],
 '수학':['수학 진로','통계','확률','수학 이야기']
};
function refinementCandidates(q,intent){
 const nq=norm(q),keys=[];
 if(intent.majorArea)keys.push(intent.majorArea);
 for(const t of intent.topics||[])keys.push(t);
 if(/약학|약사|신약|의약품|제약/.test(nq))keys.unshift('약학');
 if(/인공지능|생성형ai|ai/i.test(String(q||'')))keys.unshift('인공지능·정보');
 if(/기후|환경|탄소/.test(nq))keys.unshift('환경·기후');
 const out=[];for(const k of keys){for(const x of CURATED_REFINEMENTS[k]||[]){if(norm(x)!==nq&&!out.includes(x))out.push(x);}}
 return out.slice(0,8);
}

function cacheKey(q){return String(q||'').toLowerCase().replace(/\s+/g,' ').trim();}
function getCached(q){const k=cacheKey(q),v=INTENT_CACHE.get(k);if(!v)return null;if(Date.now()-v.at>15*60*1000){INTENT_CACHE.delete(k);return null;}return v.value;}
function setCached(q,value){const k=cacheKey(q);INTENT_CACHE.set(k,{at:Date.now(),value});if(INTENT_CACHE.size>120)INTENT_CACHE.delete(INTENT_CACHE.keys().next().value);}

function suggestCacheKey(q,idx){return `${String(idx?.version||idx?.builtAt||idx?.records?.length||'idx')}|${cacheKey(q)}`;}
function getSuggestCached(q,idx){const k=suggestCacheKey(q,idx),v=SUGGEST_CACHE.get(k);if(!v)return null;if(Date.now()-v.at>60*60*1000){SUGGEST_CACHE.delete(k);return null;}return v.value;}
function setSuggestCached(q,idx,value){const k=suggestCacheKey(q,idx);SUGGEST_CACHE.set(k,{at:Date.now(),value});if(SUGGEST_CACHE.size>160)SUGGEST_CACHE.delete(SUGGEST_CACHE.keys().next().value);}
function hasExactTitle(q,idx){const nq=norm(q);if(!nq)return false;return (idx.records||[]).some(r=>norm(r.title)===nq);}
function shouldSemanticExpand(base){
 const alreadyUnderstood=!!(base.majorArea||(base.focus||[]).length||(base.topics||[]).length||(base.genres||[]).length||(base.emotions||[]).length||base.origin||base.classicRequired||base.philosophyTradition||(base.explicitConcepts||[]).length);
 if(alreadyUnderstood)return false;
 return (base.tokens||[]).length>=1&&(base.tokens||[]).length<=4;
}
function needsSemanticAI(base,{exact=false,semanticFallback=false}={}){
 if(exact||base.majorArea)return false;
 if(semanticFallback)return true; // 유교·나치·성당·휴식처럼 로컬 사전에 없는 짧은 개념
 if(base.majorIntent&&!base.majorArea)return true; // 사전에 없는 학과/전공
 if((base.requiredTerms||[]).length>0)return true; // 가족 관련 시처럼 '주제어 + 자료형' 복합 검색
 const localAnchors=(base.topics||[]).length+(base.genres||[]).length+(base.emotions||[]).length+(base.focus||[]).length+(base.explicitConcepts||[]).length+(base.origin?1:0)+(base.classicRequired?1:0)+(base.philosophyTradition?1:0);
 return !!(base.complex&&localAnchors===0);
}
async function geminiIntent(q,base,{forceSemantic=false}={}){
 const key=process.env.GEMINI_API_KEY;if(!key||(!base.complex&&!forceSemantic))return base;
 if(base.directLookup&&!forceSemantic)return base;
 const cached=getCached(q);if(cached)return {...base,...cached,aiInterpreted:true};
 try{
  const prompt=`학교도서관 검색어의 의미를 해석하라. 책을 추천하지 말고 검색어 자체의 의미만 JSON으로 반환한다.\n
규칙:\n
1) 사용자가 직접 말하지 않은 국가·자료형·장르를 필수조건으로 만들지 않는다. 수행평가·발표·토론·보고서·참고할 책·읽으면 좋은 책·학생·진로 같은 말은 검색 목적/맥락 표현이므로 핵심 주제어로 취급하지 않는다. 학과·전공형 문장에서는 학과명 자체의 학문 주제를 가장 우선한다.\n
2) directKeywords는 검색어와 거의 같은 뜻인 동의어·다른 표기만 최대 4개. 너무 넓은 상위어를 절대 넣지 않는다.\n
3) relatedKeywords는 그 개념을 대표하는 인물·저작·사건·핵심 개념처럼 '강하게 연결되는 말'만 최대 6개. 단순한 배경어는 넣지 않는다.\n
4) contextKeywords는 함께 나오면 관련성을 높여주는 넓은 주변 맥락 최대 6개. contextKeywords 하나만으로 그 책이 검색 결과가 되어서는 안 된다.\n
5) semanticKind는 topic, entity, genre, mood, other 중 하나.\n
6) 예: 나치 → directKeywords:[나치즘,국가사회주의], relatedKeywords:[히틀러,제3제국,홀로코스트,아우슈비츠], contextKeywords:[독일,제2차세계대전,파시즘]. 유교 → directKeywords:[유학], relatedKeywords:[공자,논어,맹자,성리학], contextKeywords:[동양철학,조선사상]. 가톨릭 → directKeywords:[천주교], relatedKeywords:[성당,교황,바티칸], contextKeywords:[기독교,종교,신앙]. 성당 → directKeywords:[가톨릭성당,천주교성당], relatedKeywords:[가톨릭,천주교], contextKeywords:[교회건축,종교건축,미사].\n
7) softTopics는 환경·기후,인공지능·정보,수학,과학,의학·약학,건축·도시,역사,철학·윤리,사회·정치,심리·감정,진로·직업,예술·디자인,문학·글쓰기,여행·지리,경제·경영,스포츠 중 최대 3개.\n
형식 {"semanticKind":"topic","directKeywords":[],"relatedKeywords":[],"contextKeywords":[],"softTopics":[],"softKeywords":[]}\n검색어: ${q}`;
  const u=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key)}`;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),2800);let r;try{r=await fetch(u,{method:'POST',signal:ctrl.signal,headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.05,responseMimeType:'application/json'}})});}finally{clearTimeout(timer);}if(!r.ok)return base;const j=await r.json();const text=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return base;const x=JSON.parse(text);
  const original=String(q||'').trim();
  const direct=[original,...(x.directKeywords||[])].filter(Boolean);
  const related=[...(x.relatedKeywords||[]),...(x.coreKeywords||[])].filter(Boolean);
  const patch={softTopics:[...new Set(x.softTopics||[])].slice(0,3),softKeywords:[...new Set(x.softKeywords||[])].slice(0,8),semanticKind:String(x.semanticKind||'other'),semanticDirectKeywords:[...new Set(direct)].slice(0,6),semanticRelatedKeywords:[...new Set(related)].slice(0,8),semanticContextKeywords:[...new Set(x.contextKeywords||[])].slice(0,6),semanticCoreKeywords:[...new Set([...direct,...related])].slice(0,12),semanticFallback:!!forceSemantic,semanticAssist:true};
  // 짧은 미등록 개념을 Gemini가 성공적으로 해석한 경우, 사용자가 쓴 한 단어의 문자 그대로 일치만 강제하지 않는다.
  // 예: '유교'→공자·논어·성리학, '나치'→히틀러·홀로코스트, '휴식'→쉼·회복도 후보가 될 수 있다.
  if(forceSemantic && base.directLookup)patch.requiredTerms=[];
  setCached(q,patch);return {...base,...patch,aiInterpreted:true};
 }catch{return base;}
}
function fitLabel(score){return score>=35?'매우 적합':score>=23?'적합':'관련 있음';}
export async function runSearch(q,idx,{useAI=true,offset=0,limit=12,withSuggestions=false}={}){
 let intent=interpretLocal(q);
 const exact=hasExactTitle(q,idx),semanticFallback=!exact&&shouldSemanticExpand(intent);
 const collect=(level,currentIntent=intent)=>{
  const passIntent={...currentIntent,relaxLevel:level};
  const out=[];
  for(const r of idx.records){const s=scoreRecord(r,passIntent);if(s)out.push({...r,_score:s.score,_reasons:s.reasons,_relaxLevel:level});}
  out.sort((a,b)=>b._score-a._score||String(b.year).localeCompare(String(a.year)));
  return out;
 };
 // 1) 먼저 로컬 해석으로 '정확한 핵심' 후보를 찾는다. 충분하면 AI를 호출하지 않아 빠르다.
 let exactHits=collect(0,intent);
 // 2) 로컬만으로 결과가 부족하거나, 로컬 사전에 없는 개념/학과이면 질문 전체를 Gemini가 1회 해석한다.
 //    책별 AI 호출은 없으며 Gemini 실패 시에도 로컬 검색은 그대로 동작한다.
 const aiNeeded=useAI&&!exact&&(needsSemanticAI(intent,{exact,semanticFallback})||(intent.complex&&exactHits.length<4));
 if(aiNeeded){
  intent=await geminiIntent(q,intent,{forceSemantic:semanticFallback});
  exactHits=collect(0,intent);
 }
 // 3) 단계적 완화. 자료형·명시 장르·문학권은 끝까지 하드 조건으로 유지한다.
 let hits=exactHits.slice();
 const exactCount=hits.length;
 const merge=(level)=>{const seen=new Set(hits.map(x=>x.id));for(const r of collect(level,intent))if(!seen.has(r.id)){hits.push(r);seen.add(r.id);}hits.sort((a,b)=>a._relaxLevel-b._relaxLevel||b._score-a._score||String(b.year).localeCompare(String(a.year)));};
 if(hits.length<4)merge(1);
 if(hits.length<3)merge(2);
 // 복합 주제가 너무 희소할 때만 최종 관련자료 단계. 0건 방지를 위한 안전망이며 상위 정확 결과보다 앞서지 않는다.
 if(hits.length<2&&(intent.conceptGroups||[]).length>1)merge(3);
 const maxRelax=hits.reduce((m,x)=>Math.max(m,Number(x._relaxLevel||0)),0);
 let notice='';
 if(maxRelax>=3)notice='정확히 함께 다룬 자료가 적어 핵심 주제와 관련된 자료까지 넓혀 보여드립니다.';
 else if(maxRelax>=1&&exactCount<4)notice='핵심 조건에 가까운 자료를 우선하고 관련 자료도 함께 보여드립니다.';
 const total=hits.length;const results=hits.slice(offset,offset+limit).map(r=>({id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres,literatureOrigin:r.literatureOrigin,fit:fitLabel(r._score),reasons:r._reasons,score:Math.round(r._score*10)/10,matchLevel:Number(r._relaxLevel||0)}));
 let suggestions=[];
 if(withSuggestions&&offset===0&&hits.length){
  // 추천 검색어는 상위 결과의 잡다한 태그를 재활용하지 않는다.
  // 원 검색어와 의미적으로 직접 연결된, 사전에 검토한 하위·인접 주제만 후보로 삼고
  // 실제 우리 도서관에서 2권 이상 검색되는 경우에만 보여준다.
  const candidates=refinementCandidates(q,intent);
  const verified=await Promise.all(candidates.map(async query=>{const x=await runSearch(query,idx,{useAI:false,offset:0,limit:1,withSuggestions:false});return x.total>=1?{query,count:x.total}:null;}));suggestions=verified.filter(Boolean).slice(0,5);
 }
 return {intent,results,total,exactCount,expanded:maxRelax>0,notice,hasMore:offset+results.length<total,nextOffset:offset+results.length,suggestions};
}
async function buildSuggestions(q,idx){
 const cached=getSuggestCached(q,idx);if(cached)return cached;
 const intent=interpretLocal(q),candidates=refinementCandidates(q,intent);
 if(!candidates.length){setSuggestCached(q,idx,[]);return [];}
 const verified=await Promise.all(candidates.map(async query=>{const x=await runSearch(query,idx,{useAI:false,offset:0,limit:1,withSuggestions:false});return x.total>=1?{query,count:x.total}:null;}));
 const out=verified.filter(Boolean).slice(0,5);setSuggestCached(q,idx,out);return out;
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});const q=String(req.query?.q||'').trim();if(!q)return res.status(400).json({ok:false,message:'검색어를 입력해 주세요.'});
 const offset=Math.max(0,Number(req.query?.offset||0)||0),limit=Math.min(24,Math.max(1,Number(req.query?.limit||12)||12));
 try{
  const idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});
  if(!idx?.records)return res.status(503).json({ok:false,message:'아직 검색 인덱스가 준비되지 않았습니다. 관리자에서 통합 구축을 먼저 실행해 주세요.'});
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
  if(String(req.query?.mode||'')==='suggestions'){const suggestions=await buildSuggestions(q,idx);return res.status(200).json({ok:true,query:q,suggestions});}
  const {intent,results,total,hasMore,nextOffset}=await runSearch(q,idx,{useAI:true,offset,limit,withSuggestions:false});
  return res.status(200).json({ok:true,version:idx.version||'unknown',query:q,intent:{majorIntent:!!intent.majorIntent,majorArea:intent.majorArea||null,material:intent.material,genres:intent.genres,topics:intent.topics,emotions:intent.emotions,origin:intent.origin,classicRequired:intent.classicRequired,classicTarget:intent.classicTarget||null,philosophyTradition:intent.philosophyTradition,requiredTerms:intent.requiredTerms,explicitConcepts:(intent.explicitConcepts||[]).map(x=>x.name),compoundConcepts:!!intent.compoundConcepts,aiInterpreted:!!intent.aiInterpreted,semanticKind:intent.semanticKind||null,semanticCoreKeywords:intent.semanticCoreKeywords||[],semanticDirectKeywords:intent.semanticDirectKeywords||[],semanticRelatedKeywords:intent.semanticRelatedKeywords||[]},count:results.length,total,hasMore,nextOffset,suggestions:[],results});
 }catch(e){return res.status(500).json({ok:false,message:'검색 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
