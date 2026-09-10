import { requireAdmin } from '../admin-auth.mjs';
const TEST_ISBN='9791191824001';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});
 if(!requireAdmin(req,res))return;
 const key=process.env.NLK_API_KEY;if(!key)return res.status(503).json({ok:false,message:'NLK_API_KEY가 설정되어 있지 않습니다.'});
 try{
  const p=new URLSearchParams({key,apiType:'json',pageNum:'1',pageSize:'3',category:'도서',detailSearch:'true',isbnOp:'isbn',isbnCode:TEST_ISBN});
  const r=await fetch(`https://www.nl.go.kr/NL/search/openApi/search.do?${p}`,{cache:'no-store'});const raw=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}: ${raw.slice(0,300)}`);const j=JSON.parse(raw);const rec=Array.isArray(j?.result)?j.result[0]:null;
  if(!rec)return res.status(200).json({ok:true,version:'V6.0',recordFound:false,message:'국립중앙도서관 API 연결은 정상이나 테스트 ISBN 검색 결과가 없습니다.'});
  return res.status(200).json({ok:true,version:'V6.0',recordFound:true,message:'국립중앙도서관 ISBN 검색과 필드 파싱이 정상입니다.',sample:{title:rec.titleInfo||'',author:rec.authorInfo||'',publisher:rec.pubInfo||'',year:rec.pubYearInfo||'',isbn:rec.isbn||TEST_ISBN,kdcCode:rec.classNo||rec.kdcCode1s||'',kdcName:rec.kdcName1s||'',callNo:rec.callNo||''}});
 }catch(e){return res.status(500).json({ok:false,version:'V6.0',message:'국립중앙도서관 연결 확인 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
