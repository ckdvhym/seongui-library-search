import { readJson,writeJson,chunkPath } from '../storage.mjs';

function clipRaw(v,n){return String(v??'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,n);}
async function yes24Fallback(isbn13){
  const key=process.env.YES24_API_KEY;if(!key||!isbn13)return null;
  try{
    const u=new URL('https://apis.yes24.com/v1/goods/itemDetail');u.searchParams.set('searchType','ISBN13');u.searchParams.set('query',isbn13);u.searchParams.set('detail','Y');
    const r=await fetch(u,{headers:{'X-Api-Key':key,Accept:'application/json'},cache:'no-store'});if(!r.ok)return null;
    const j=await r.json(),it=j?.data?.items?.[0]||j?.items?.[0]||j?.data?.item?.[0]||j?.data?.[0]||j?.item?.[0]||j?.item||null;if(!it)return null;
    return {status:'found',itemId:it.itemId||null,cover:it.cover||null,link:it.link||null,publishDate:it.publishDate||null,pages:it.pages||it.pageCount||null,introduction:clipRaw(it.contentDetail?.bookIntroduction||'',2400),toc:clipRaw(it.contentDetail?.tableOfContents||'',8000),summary:clipRaw(it.contentDetail?.bookSummary||'',1600),goodsType:it.goodsType||null,adultYn:it.adultYn||null};
  }catch{return null;}
}

export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});
 try{
   const id=String(req.query?.id||''),chunk=Number(req.query?.chunk),requestIsbn=String(req.query?.isbn||'').replace(/[^0-9Xx]/g,'');if(!id||!Number.isInteger(chunk)||chunk<0)return res.status(400).json({ok:false,message:'잘못된 요청입니다.'});
   const path=chunkPath(chunk),x=await readJson(path,null);const r=x?.records?.find(v=>v.id===id)||null;
   let y=r?.yes24||{},isbn13=r?.isbn13||requestIsbn;
   const needsRepair=!y.cover||!y.introduction;
   if(needsRepair&&isbn13){
     const fresh=await yes24Fallback(isbn13);
     if(fresh){y={...y,...fresh};if(r){r.yes24=y;r.updatedAt=new Date().toISOString();try{await writeJson(path,x);}catch{}}}
   }
   if(!r&&!y.introduction&&!y.cover)return res.status(404).json({ok:false,message:'추가 메타데이터가 아직 없습니다.'});
   res.status(200).json({ok:true,introduction:y.introduction||'',toc:y.toc||'',summary:y.summary||'',cover:y.cover||null,sourceLink:y.link||null,topics:r?.profile?.topics||[],genres:r?.profile?.genres||[],emotions:r?.profile?.emotions||[],repaired:needsRepair&&!!(y.introduction||y.cover)});
 }catch(e){res.status(500).json({ok:false,message:'상세정보를 읽지 못했습니다.',detail:String(e?.message||e)});}
}
