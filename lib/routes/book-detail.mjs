import { readJson,writeJson,chunkPath,PATHS } from '../storage.mjs';

function clipRaw(v,n){return String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,n);}
function norm(v){return String(v||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[\[\](){}<>《》『』「」“”‘’'"·,:;.!?\-_/]/g,'');}
function cleanIsbn(v){const x=String(v||'').replace(/[^0-9Xx]/g,'');return x.length===13?x:'';}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function parseItem(it){
  if(!it)return null;
  return {status:'found',itemId:it.itemId||null,isbn13:cleanIsbn(it.isbn13),title:it.title||'',author:it.author||'',publisher:it.publisher||'',cover:it.cover||null,link:it.link||null,publishDate:it.publishDate||null,pages:it.pages||it.pageCount||null,introduction:clipRaw(it.contentDetail?.bookIntroduction||'',2400),toc:clipRaw(it.contentDetail?.tableOfContents||'',8000),summary:clipRaw(it.contentDetail?.bookSummary||'',1600),goodsType:it.goodsType||null,adultYn:it.adultYn||null};
}
async function fetchJson(u,key){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(u,{headers:{'X-Api-Key':key,Accept:'application/json'},cache:'no-store'});
      if(r.status===429||r.status>=500){if(attempt===0){await wait(350);continue;}return null;}
      if(!r.ok)return null;
      return await r.json();
    }catch{if(attempt===0){await wait(250);continue;}return null;}
  }
  return null;
}
async function yes24ByIsbn(isbn13){
  const key=process.env.YES24_API_KEY;if(!key||!isbn13)return null;
  const u=new URL('https://apis.yes24.com/v1/goods/itemDetail');u.searchParams.set('searchType','ISBN13');u.searchParams.set('query',isbn13);u.searchParams.set('detail','Y');
  const j=await fetchJson(u,key);return parseItem(j?.data?.items?.[0]||null);
}
async function yes24ByExactTitle(title,{author='',publisher=''}={}){
  const key=process.env.YES24_API_KEY;if(!key||!title)return null;
  const u=new URL('https://apis.yes24.com/v1/goods/itemList');u.searchParams.set('query',title);u.searchParams.set('page','1');u.searchParams.set('pageSize','10');u.searchParams.set('detail','Y');
  const j=await fetchJson(u,key),items=Array.isArray(j?.data?.items)?j.data.items:[];if(!items.length)return null;
  const nt=norm(title),na=norm(author),np=norm(publisher);
  const scored=items.map(it=>{
    const t=norm(it?.title),a=norm(it?.author),p=norm(it?.publisher);let s=0;
    if(t===nt)s+=100;else if(t.includes(nt)||nt.includes(t))s+=35;
    if(na&&a&&(a.includes(na)||na.includes(a)))s+=18;
    if(np&&p&&(p.includes(np)||np.includes(p)))s+=10;
    return {it,s};
  }).sort((a,b)=>b.s-a.s);
  if(!scored[0]||scored[0].s<100)return null; // 제목 완전 일치만 자동 복구
  return parseItem(scored[0].it);
}
function hasUseful(y){return !!(y?.cover||y?.introduction||y?.toc);}

export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});
 try{
   const id=String(req.query?.id||''),chunk=Number(req.query?.chunk),requestIsbn=cleanIsbn(req.query?.isbn),query=String(req.query?.q||'').trim();
   if(!id||!Number.isInteger(chunk)||chunk<0)return res.status(400).json({ok:false,message:'잘못된 요청입니다.'});
   const path=chunkPath(chunk),x=await readJson(path,null);const r=x?.records?.find(v=>v.id===id)||null;
   let y=r?.yes24||{},repairSource='stored',isbn13=requestIsbn||cleanIsbn(r?.isbn13);
   const needsRepair=!y.cover||!y.introduction;
   if(needsRepair&&isbn13){
     const fresh=await yes24ByIsbn(isbn13);
     if(hasUseful(fresh)){y={...y,...fresh};repairSource='isbn';}
   }
   // ISBN 상세조회가 실패한 과거 데이터는, 사용자가 그 책 제목을 정확히 검색했을 때만
   // YES24 제목검색 1회를 추가해 복구한다. 일반 주제검색에는 호출하지 않아 쿼터/속도를 보호한다.
   if(needsRepair&&!hasUseful(y)&&query&&r?.title&&norm(query)===norm(r.title)){
     const catalog=await readJson(PATHS.catalog,null),b=catalog?.books?.find(v=>v.id===id)||null;
     const fresh=await yes24ByExactTitle(r.title,{author:b?.identity?.author||'',publisher:b?.identity?.publisher||''});
     if(hasUseful(fresh)){y={...y,...fresh};repairSource='exact_title';isbn13=fresh.isbn13||isbn13;}
   }
   if(r&&repairSource!=='stored'&&hasUseful(y)){
     r.yes24=y;if(isbn13)r.isbn13=isbn13;r.updatedAt=new Date().toISOString();
     try{await writeJson(path,x);}catch{}
   }
   if(!r&&!hasUseful(y))return res.status(404).json({ok:false,message:'추가 메타데이터가 아직 없습니다.'});
   res.status(200).json({ok:true,introduction:y.introduction||'',toc:y.toc||'',summary:y.summary||'',cover:y.cover||null,sourceLink:y.link||null,topics:r?.profile?.topics||[],genres:r?.profile?.genres||[],emotions:r?.profile?.emotions||[],repaired:repairSource!=='stored',repairSource});
 }catch(e){res.status(500).json({ok:false,message:'상세정보를 읽지 못했습니다.',detail:String(e?.message||e)});}
}
