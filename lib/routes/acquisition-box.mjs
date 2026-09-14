import * as XLSX from 'xlsx';
import {requireAdmin} from '../admin-auth.mjs';
import {readJson,writeJson,PATHS} from '../storage.mjs';
import {addHistory} from '../history.mjs';
const EMPTY={version:'V9.0',items:[]};
const s=v=>v==null?'':String(v).trim();
const norm=v=>s(v).normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[\[\](){}<>《》『』「」“”‘’'"·,:;.!?\-_/]/g,'');
const isbn=v=>s(v).replace(/[^0-9Xx]/g,'');
function makeId(){return `acq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;}
function candidateKey(x={}){const i=isbn(x.isbn);if(i.length>=10)return `isbn:${i}`;const title=norm(x.label||x.title),author=norm(x.author);return `book:${title}|${author}`;}
function normalizeItem(body={}){const label=s(body.label||body.title);return {id:makeId(),type:s(body.type||'검색 수요'),label:label.slice(0,160),author:s(body.author).slice(0,100),publisher:s(body.publisher).slice(0,100),isbn:isbn(body.isbn).slice(0,20),source:s(body.source||body.type||'직접 저장').slice(0,160),sourceId:s(body.sourceId).slice(0,100),searchCount:Number(body.searchCount||0)||0,currentResults:body.currentResults==null?null:Number(body.currentResults||0),note:s(body.note).slice(0,300),createdAt:new Date().toISOString(),candidateKey:candidateKey({...body,label})};}
export default async function handler(req,res){
 if(!requireAdmin(req,res))return;try{const action=String(req.query?.action||'list'),doc=await readJson(PATHS.acquisitionBox,EMPTY);doc.items=Array.isArray(doc.items)?doc.items:[];
  // 기존 저장 데이터에도 중복 판별키를 런타임에서 보완한다.
  doc.items=doc.items.map(x=>({...x,candidateKey:x.candidateKey||candidateKey(x),source:x.source||x.type||'기존 후보'}));
  if(req.method==='GET'&&action==='list')return res.status(200).json({ok:true,items:doc.items});
  if(req.method==='GET'&&action==='export'){const rows=doc.items.map(x=>({'구분':x.type||'','주제/도서명':x.label||'','저자':x.author||'','출판사':x.publisher||'','ISBN':x.isbn||'','출처':x.source||'','검색횟수':x.searchCount||'','현재 적합자료 수':x.currentResults??'','메모':x.note||'','저장일':String(x.createdAt||'').slice(0,10)}));const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:14},{wch:36},{wch:20},{wch:20},{wch:18},{wch:28},{wch:12},{wch:16},{wch:38},{wch:12}];XLSX.utils.book_append_sheet(wb,ws,'수서 후보');const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="acquisition-candidates.xlsx"');return res.status(200).send(buf);}
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  if(action==='add'||action==='add-many'){
   const incoming=action==='add-many'?(Array.isArray(body.items)?body.items:[]):[body];if(!incoming.length)return res.status(400).json({ok:false,message:'저장할 후보가 없습니다.'});
   const existing=new Set(doc.items.map(x=>x.candidateKey||candidateKey(x))),added=[];let skipped=0;
   for(const raw of incoming){const item=normalizeItem(raw);if(!item.label)continue;if(existing.has(item.candidateKey)){skipped++;continue;}existing.add(item.candidateKey);added.push(item);}
   if(added.length){doc.items=[...added,...doc.items];await writeJson(PATHS.acquisitionBox,doc);await addHistory('acquisition','수서 후보 저장',{count:added.length,source:added[0]?.source||''});}
   return res.status(200).json({ok:true,message:added.length?`${added.length}종을 수서 후보함에 저장했습니다.${skipped?` 중복 ${skipped}종은 제외했습니다.`:''}`:`이미 수서 후보함에 등록된 자료입니다.`,added:added.length,skipped,items:added});
  }
  if(action==='remove'){const before=doc.items.length;doc.items=doc.items.filter(x=>x.id!==body.id);if(doc.items.length===before)return res.status(404).json({ok:false,message:'항목을 찾지 못했습니다.'});await writeJson(PATHS.acquisitionBox,doc);return res.status(200).json({ok:true,message:'수서 후보에서 삭제했습니다.'});}
  return res.status(400).json({ok:false,message:'알 수 없는 작업입니다.'});
 }catch(e){return res.status(500).json({ok:false,message:'수서 후보 처리 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
