import * as XLSX from 'xlsx';
import {requireAdmin} from '../admin-auth.mjs';
import {readJson,writeJson,PATHS} from '../storage.mjs';
import {addHistory} from '../history.mjs';
const EMPTY={version:'V9.0',items:[]};
const s=v=>v==null?'':String(v).trim();
function makeId(){return `acq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;}
export default async function handler(req,res){
 if(!requireAdmin(req,res))return;try{const action=String(req.query?.action||'list'),doc=await readJson(PATHS.acquisitionBox,EMPTY);
  if(req.method==='GET'&&action==='list')return res.status(200).json({ok:true,items:doc.items||[]});
  if(req.method==='GET'&&action==='export'){const rows=(doc.items||[]).map(x=>({'구분':x.type||'','주제/도서명':x.label||'','검색횟수':x.searchCount||'','현재 적합자료 수':x.currentResults??'','메모':x.note||'','저장일':String(x.createdAt||'').slice(0,10)}));const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:14},{wch:36},{wch:12},{wch:16},{wch:38},{wch:12}];XLSX.utils.book_append_sheet(wb,ws,'수서 후보');const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="acquisition-candidates.xlsx"');return res.status(200).send(buf);}
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  if(action==='add'){const label=s(body.label);if(!label)return res.status(400).json({ok:false,message:'저장할 주제나 도서명을 입력해 주세요.'});const item={id:makeId(),type:s(body.type||'검색 수요'),label:label.slice(0,120),searchCount:Number(body.searchCount||0)||0,currentResults:body.currentResults==null?null:Number(body.currentResults||0),note:s(body.note).slice(0,300),createdAt:new Date().toISOString()};doc.items=[item,...(doc.items||[])];await writeJson(PATHS.acquisitionBox,doc);await addHistory('acquisition','수서 후보 저장',{label:item.label});return res.status(200).json({ok:true,message:'수서 후보함에 저장했습니다.',item});}
  if(action==='remove'){const before=(doc.items||[]).length;doc.items=(doc.items||[]).filter(x=>x.id!==body.id);if(doc.items.length===before)return res.status(404).json({ok:false,message:'항목을 찾지 못했습니다.'});await writeJson(PATHS.acquisitionBox,doc);return res.status(200).json({ok:true,message:'수서 후보에서 삭제했습니다.'});}
  return res.status(400).json({ok:false,message:'알 수 없는 작업입니다.'});
 }catch(e){return res.status(500).json({ok:false,message:'수서 후보 처리 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
