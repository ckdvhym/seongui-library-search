import {readJson,PATHS} from '../storage.mjs';
import {runSearch} from './search.mjs';

const TOPIC_QUERY={
 '환경·기후':'환경과 기후','인공지능·정보':'인공지능','수학':'수학','과학':'과학','의학·약학':'의학과 약학','건축·도시':'건축과 도시','역사':'역사','철학·윤리':'철학과 윤리','사회·정치':'사회 문제','심리·감정':'심리','진로·직업':'진로와 직업','예술·디자인':'예술과 디자인','문학·글쓰기':'문학과 글쓰기','여행·지리':'여행과 지리','경제·경영':'경제와 경영','스포츠':'스포츠'
};
const GENRE_QUERY={'로맨스':'로맨스','추리':'추리 소설','미스터리':'미스터리 소설','SF':'SF 소설','판타지':'판타지 소설','고전':'고전 소설','시':'시집','에세이':'에세이','소설':'소설'};
let BROWSE_CACHE={key:'',at:0,groups:[]};
const BROWSE_GROUPS=[
 {id:'career',title:'진로로 찾기',items:['간호 진로','약학 진로','수의사 관련 책','건축 진로','인공지능 진로','생명과학 진로']},
 {id:'topic',title:'관심 주제로 찾기',items:['환경과 기후','인공지능','심리','역사','철학과 윤리','경제와 경영']},
 {id:'fiction',title:'소설 골라보기',items:['로맨스','추리 소설','SF 소설','고전 소설','슬픈 소설','환경 관련 소설']},
 {id:'light',title:'가볍게 읽기',items:['재미있는 책','힐링을 원할 때','에세이','여행 책']},
 {id:'deep',title:'깊이 탐구하기',items:['AI 윤리','기후 위기','생명공학과 윤리','사회 문제','자유주의와 경제 격차']}
];
function bookPublic(r){return {id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres};}
async function validQuery(q,idx,min=2){const x=await runSearch(q,idx,{useAI:false,offset:0,limit:1,withSuggestions:false});return x.total>=min?{query:q,count:x.total}:null;}
function overlap(a=[],b=[]){const B=new Set(b);let n=0;for(const x of a)if(B.has(x))n++;return n;}
function similarity(a,b){let s=0;s+=overlap(a.primaryTopics||a.topics,b.primaryTopics||b.topics)*7;s+=overlap(a.genres,b.genres)*5;s+=overlap(a.emotions,b.emotions)*3;if(a.materialType&&a.materialType===b.materialType)s+=2;if(a.literatureOrigin&&a.literatureOrigin===b.literatureOrigin)s+=2;if(a.kdc&&b.kdc&&String(a.kdc)[0]===String(b.kdc)[0])s+=1;return s;}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});
 try{const action=String(req.query?.action||'browse'),idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});if(!idx?.records)return res.status(503).json({ok:false,message:'검색 인덱스가 준비되지 않았습니다.'});
  if(action==='browse'){
   const key=String(idx.builtAt||idx.version||idx.records.length);if(BROWSE_CACHE.key===key&&Date.now()-BROWSE_CACHE.at<15*60*1000)return res.status(200).json({ok:true,groups:BROWSE_CACHE.groups,cached:true});
   const groups=[];for(const g of BROWSE_GROUPS){const checked=await Promise.all(g.items.map(q=>validQuery(q,idx,3)));const items=checked.filter(Boolean).slice(0,6);if(items.length>=2)groups.push({id:g.id,title:g.title,items});}BROWSE_CACHE={key,at:Date.now(),groups};return res.status(200).json({ok:true,groups,cached:false});
  }
  if(action==='suggestions'){
   const q=String(req.query?.q||'').trim();if(!q)return res.status(200).json({ok:true,suggestions:[]});const base=await runSearch(q,idx,{useAI:false,offset:0,limit:24,withSuggestions:false});const freq=new Map();for(const r of base.results){for(const t of r.topics||[])if(TOPIC_QUERY[t])freq.set(TOPIC_QUERY[t],(freq.get(TOPIC_QUERY[t])||0)+1);for(const g of r.genres||[])if(GENRE_QUERY[g])freq.set(GENRE_QUERY[g],(freq.get(GENRE_QUERY[g])||0)+1);}const candidates=[...freq.entries()].filter(([x])=>x.replace(/\s/g,'')!==q.replace(/\s/g,'')).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);const checked=await Promise.all(candidates.map(x=>validQuery(x,idx,2)));return res.status(200).json({ok:true,suggestions:checked.filter(Boolean).slice(0,5)});
  }
  if(action==='related'){
   const id=String(req.query?.id||''),seed=idx.records.find(x=>x.id===id);if(!seed)return res.status(404).json({ok:false,message:'책을 찾지 못했습니다.'});const related=idx.records.filter(x=>x.id!==id).map(x=>({x,s:similarity(seed,x)})).filter(v=>v.s>=6).sort((a,b)=>b.s-a.s||String(b.x.year).localeCompare(String(a.x.year))).slice(0,6).map(v=>bookPublic(v.x));const tags=[...(seed.primaryTopics||seed.topics||[]),...(seed.genres||[])];const candidates=[...new Set(tags.map(t=>TOPIC_QUERY[t]||GENRE_QUERY[t]).filter(Boolean))];const checked=await Promise.all(candidates.slice(0,7).map(x=>validQuery(x,idx,3)));return res.status(200).json({ok:true,related,topics:checked.filter(Boolean).slice(0,5)});
  }
  if(action==='new'){
   const records=idx.records.filter(x=>x.latestRegistrationDate).sort((a,b)=>String(b.latestRegistrationDate).localeCompare(String(a.latestRegistrationDate))).slice(0,12).map(bookPublic);return res.status(200).json({ok:true,books:records});
  }
  return res.status(400).json({ok:false,message:'알 수 없는 탐색 요청입니다.'});
 }catch(e){return res.status(500).json({ok:false,message:'탐색 정보를 만들지 못했습니다.',detail:String(e?.message||e)});}
}
