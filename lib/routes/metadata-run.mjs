import { requireAdmin } from '../admin-auth.mjs';
import { readJson,writeJson,PATHS,chunkPath } from '../storage.mjs';
import { deriveProfile,cleanText } from '../profile.mjs';
const BATCH=80;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function isbn(v){const x=String(v||'').replace(/[^0-9Xx]/g,'');return x.length===13?x:'';}
function clip(v,n){return cleanText(v).slice(0,n);}
async function yes24One(isbn13,slot){
  const key=process.env.YES24_API_KEY;if(!key)return {status:'no_key'};
  await wait(slot*125); // Basic 10/sec보다 조금 느리게 분산
  const u=new URL('https://apis.yes24.com/v1/goods/itemDetail');u.searchParams.set('searchType','ISBN13');u.searchParams.set('query',isbn13);u.searchParams.set('detail','Y');
  for(let attempt=0;attempt<3;attempt++){
    const r=await fetch(u,{headers:{'X-Api-Key':key,Accept:'application/json'},cache:'no-store'});
    if(r.status===429){const sec=Number(r.headers.get('retry-after')||1);await wait(Math.max(1000,sec*1000)*(attempt+1));continue;}
    if(r.status===404)return {status:'not_found'};
    if(!r.ok)return {status:'error',error:`HTTP ${r.status}`};
    const j=await r.json();const it=j?.data?.items?.[0];if(!it)return {status:'not_found'};
    return {status:'found',itemId:it.itemId||null,cover:it.cover||null,link:it.link||null,publishDate:it.publishDate||null,pages:it.pages||it.pageCount||null,introduction:clip(it.contentDetail?.bookIntroduction||'',1800),toc:clip(it.contentDetail?.tableOfContents||'',5000),summary:clip(it.contentDetail?.bookSummary||'',1200),goodsType:it.goodsType||null,adultYn:it.adultYn||null};
  }
  return {status:'rate_limited'};
}
async function nlkOne(isbn13){
 const key=process.env.NLK_API_KEY;if(!key)return {status:'no_key'};
 const p=new URLSearchParams({key,apiType:'json',pageNum:'1',pageSize:'3',category:'도서',detailSearch:'true',isbnOp:'isbn',isbnCode:isbn13});
 try{const r=await fetch(`https://www.nl.go.kr/NL/search/openApi/search.do?${p}`,{cache:'no-store'});if(!r.ok)return {status:'error'};const j=await r.json();const rec=Array.isArray(j?.result)?j.result[0]:null;if(!rec)return {status:'not_found'};return {status:'found',title:rec.titleInfo||'',author:rec.authorInfo||'',publisher:rec.pubInfo||'',year:rec.pubYearInfo||'',isbn:rec.isbn||isbn13,kdc:rec.classNo||rec.kdcCode1s||'',kdcName:rec.kdcName1s||'',controlNo:rec.controlNo||'',detailLink:rec.detailLink||''};}catch{return {status:'error'};}
}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});if(!requireAdmin(req,res))return;
 try{
  const catalog=await readJson(PATHS.catalog);if(!catalog?.books?.length)throw new Error('서버 기본 카탈로그가 없습니다.');
  let p=await readJson(PATHS.metaState,{version:'V6.0',processed:0,yes24Found:0,yes24Missing:0,nlkFallbackFound:0,errors:0});
  const start=Math.min(Number(p.processed||0),catalog.books.length);if(start>=catalog.books.length)return res.status(200).json({ok:true,completed:true,...p,total:catalog.books.length,message:'전체 메타데이터 1차 구축이 이미 완료되었습니다.'});
  const end=Math.min(start+BATCH,catalog.books.length);const slice=catalog.books.slice(start,end);
  const yes=await Promise.all(slice.map((b,i)=>{const x=isbn(b.identity?.isbn13);return x?yes24One(x,i):Promise.resolve({status:'no_isbn'});}));
  const records=[];
  for(let i=0;i<slice.length;i++){
    const b=slice[i],y=yes[i];let nlk={status:'skipped'};const idIsbn=isbn(b.identity?.isbn13);
    if(idIsbn && (y.status!=='found'||!b.holding?.kdc)) nlk=await nlkOne(idIsbn);
    const meta={introduction:y.introduction||'',toc:y.toc||''};const prof=deriveProfile(b,meta);
    records.push({id:b.id,isbn13:idIsbn,title:b.identity?.title||'',yes24:y,nlk,profile:prof,updatedAt:new Date().toISOString()});
    if(y.status==='found')p.yes24Found=(p.yes24Found||0)+1;else if(['not_found','no_isbn'].includes(y.status))p.yes24Missing=(p.yes24Missing||0)+1;else p.errors=(p.errors||0)+1;
    if(nlk.status==='found')p.nlkFallbackFound=(p.nlkFallbackFound||0)+1;
  }
  const chunkNo=Math.floor(start/BATCH);await writeJson(chunkPath(chunkNo),{version:'V6.0',chunkNo,start,end,records});
  p={...p,version:'V6.0',batchSize:BATCH,processed:end,total:catalog.books.length,lastUpdatedAt:new Date().toISOString(),completed:end>=catalog.books.length};await writeJson(PATHS.metaState,p);
  return res.status(200).json({ok:true,...p,chunkNo,justProcessed:end-start,remaining:catalog.books.length-end,message:p.completed?'전체 장서의 1차 메타데이터 구축이 완료되었습니다.':'배치 저장 완료. 진행상황이 서버에 영구 저장되었습니다.'});
 }catch(e){res.status(500).json({ok:false,message:'메타데이터 구축 배치 처리 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)});}
}
