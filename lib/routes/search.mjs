import { readJson,PATHS } from '../storage.mjs';
import { interpretLocal,scoreRecord } from '../profile.mjs';
async function geminiIntent(q,base){
 const key=process.env.GEMINI_API_KEY;if(!key||!base.complex)return base;
 try{
  const prompt=`학교도서관 검색어를 구조화하라. 책을 추천하지 말고 검색 의도만 JSON으로 반환. 가능한 material: 소설,시,에세이. genres는 추리·미스터리,SF,판타지,로맨스,역사소설,성장소설,공포,유머 중. topics는 환경·기후,인공지능·정보,수학,과학,의학·약학,건축·도시,역사,철학·윤리,사회·정치,심리·감정,진로·직업,예술·디자인,문학·글쓰기,여행·지리,경제·경영,스포츠 중 선택. origin은 한국,일본,중국,영미,프랑스,독일,이탈리아,스페인·포르투갈 중 명시된 경우만. classic은 사용자가 고전/고전문학/고전소설을 요구할 때만 true. emotions는 슬픔·상실,위로·회복,긴장·공포,유머·경쾌,반전 중 명시된 경우만. JSON 형식 {"material":[],"genres":[],"topics":[],"origin":null,"classic":false,"emotions":[],"keywords":[]}\n검색어: ${q}`;
  const u=`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(key)}`;
  const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}})});if(!r.ok)return base;const j=await r.json();const text=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return base;const x=JSON.parse(text);
  return {...base,material:[...new Set([...(base.material||[]),...(x.material||[])])],genres:[...new Set([...(base.genres||[]),...(x.genres||[])])],topics:[...new Set([...(base.topics||[]),...(x.topics||[])])],emotions:[...new Set([...(base.emotions||[]),...(x.emotions||[])])],origin:base.origin||x.origin||null,classicRequired:!!(base.classicRequired||x.classic),tokens:[...new Set([...(base.tokens||[]),...(x.keywords||[])])],aiInterpreted:true};
 }catch{return base;}
}
function fitLabel(score){return score>=34?'매우 적합':score>=22?'적합':'관련 있음';}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});const q=String(req.query?.q||'').trim();if(!q)return res.status(400).json({ok:false,message:'검색어를 입력해 주세요.'});
 try{
  const idx=await readJson(PATHS.searchIndex,null);if(!idx?.records)return res.status(503).json({ok:false,message:'아직 검색 인덱스가 준비되지 않았습니다. 관리자에서 통합 구축을 먼저 실행해 주세요.'});
  let intent=interpretLocal(q);intent=await geminiIntent(q,intent);const hits=[];
  for(const r of idx.records){const s=scoreRecord(r,intent);if(s)hits.push({...r,_score:s.score,_reasons:s.reasons});}
  hits.sort((a,b)=>b._score-a._score||String(b.year).localeCompare(String(a.year)));
  const results=hits.slice(0,12).map(r=>({id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres,literatureOrigin:r.literatureOrigin,fit:fitLabel(r._score),reasons:r._reasons,score:Math.round(r._score*10)/10}));
  res.status(200).json({ok:true,version:idx.version||'unknown',query:q,intent:{material:intent.material,genres:intent.genres,topics:intent.topics,emotions:intent.emotions,origin:intent.origin,classicRequired:intent.classicRequired,aiInterpreted:!!intent.aiInterpreted},count:results.length,results});
 }catch(e){res.status(500).json({ok:false,message:'검색 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
