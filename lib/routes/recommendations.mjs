import * as XLSX from 'xlsx';
import {readJson,writeJson,PATHS} from '../storage.mjs';
import {requireAdmin} from '../admin-auth.mjs';
import {addHistory} from '../history.mjs';

const EMPTY={version:'V9.0',updatedAt:null,lists:[]};
const TYPES=['교과연계','수행평가','진로연계','기관추천','사서추천','신간','행사·프로그램','기타'];
const s=v=>v==null?'':String(v).trim();
const norm=v=>s(v).normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[\[\](){}<>《》『』「」“”‘’'"·,:;.!?\-_/]/g,'');
const isbn=v=>{const x=s(v).replace(/[^0-9Xx]/g,'');return x.length>=10?x:'';};
function id(){return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;}
function dateOk(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''));}
function safeList(v={},prev={}){const order=Number.isFinite(Number(v.displayOrder))?Number(v.displayOrder):(Number.isFinite(Number(prev.displayOrder))?Number(prev.displayOrder):9999);return {id:s(v.id||prev.id||id()),name:s(v.name||prev.name).slice(0,100),type:TYPES.includes(s(v.type))?s(v.type):(TYPES.includes(prev.type)?prev.type:'기타'),description:s(v.description??prev.description).slice(0,400),startDate:dateOk(v.startDate)?v.startDate:(prev.startDate||''),endDate:dateOk(v.endDate)?v.endDate:(prev.endDate||''),active:v.active===undefined?(prev.active??true):!!v.active,featured:v.featured===undefined?(prev.featured??true):!!v.featured,displayOrder:order,items:Array.isArray(prev.items)?prev.items:[],createdAt:prev.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};}
function sortLists(lists=[]){return [...lists].sort((a,b)=>(Number(a.displayOrder??9999)-Number(b.displayOrder??9999)));}
function normalizeOrders(lists=[]){return sortLists(lists).map((x,i)=>({...x,displayOrder:i+1}));}
function isVisible(x){if(!x.active)return false;const today=new Date().toISOString().slice(0,10);if(x.startDate&&today<x.startDate)return false;if(x.endDate&&today>x.endDate)return false;return true;}
async function bodyBuffer(req){if(Buffer.isBuffer(req.body))return req.body;if(req.body instanceof Uint8Array)return Buffer.from(req.body);if(typeof req.body==='string')return Buffer.from(req.body,'binary');const chunks=[];for await(const c of req)chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));return Buffer.concat(chunks);}
function parseRows(buf){const wb=XLSX.read(buf,{type:'buffer'}),ws=wb.Sheets['추천도서 입력']||wb.Sheets[wb.SheetNames[0]];if(!ws)throw new Error('엑셀 시트를 찾지 못했습니다.');const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});if(!rows.length)return[];const cols=new Set(Object.keys(rows[0]));if(!cols.has('도서명'))throw new Error('엑셀에 “도서명” 열이 필요합니다. 관리자 화면의 양식을 사용해 주세요.');return rows;}
function publicBook(r){return {id:r.id,chunk:r.chunk,title:r.title,author:r.author,publisher:r.publisher,year:r.year,isbn13:r.isbn13,copies:r.copies,callNumbers:r.callNumbers,locations:r.locations,cover:r.cover,introPreview:r.introPreview,topics:r.primaryTopics?.length?r.primaryTopics:r.topics,genres:r.genres};}
function matchRows(rows,idx){const records=idx?.records||[],byIsbn=new Map(),byTitle=new Map();for(const r of records){const i=isbn(r.isbn13);if(i&&!byIsbn.has(i))byIsbn.set(i,r);const t=norm(r.title);if(!byTitle.has(t))byTitle.set(t,[]);byTitle.get(t).push(r);}return rows.filter(r=>s(r['도서명'])).map((r,n)=>{const title=s(r['도서명']),author=s(r['저자']),publisher=s(r['출판사']),i=isbn(r['ISBN']),note=s(r['개별 추천·선정 정보']||r['추천·선정 정보']);let hit=i?byIsbn.get(i):null,method=hit?'ISBN':'';if(!hit){const candidates=byTitle.get(norm(title))||[];if(candidates.length===1){hit=candidates[0];method='제목';}else if(candidates.length>1&&author){const na=norm(author);hit=candidates.find(x=>norm(x.author).includes(na)||na.includes(norm(x.author)))||null;if(hit)method='제목+저자';}}
 return {row:n+2,title,author,publisher,isbn:i,note,matchStatus:hit?'소장':'미소장',matchMethod:method,bookId:hit?.id||null,book:hit?publicBook(hit):null};});}
function templateBuffer(){const rows=[{'도서명':'침묵의 봄','저자':'레이첼 카슨','출판사':'에코리브르','ISBN':'9788962630619','개별 추천·선정 정보':'선택 입력 예시'},{'도서명':'','저자':'','출판사':'','ISBN':'','개별 추천·선정 정보':''}];const wb=XLSX.utils.book_new(),guide=XLSX.utils.aoa_to_sheet([['추천도서 업로드 안내'],['필수 항목','도서명'],['선택 항목','저자 / 출판사 / ISBN / 개별 추천·선정 정보'],['권장','ISBN이 있으면 소장자료와 가장 정확하게 연결됩니다.'],['주의','목록 전체의 구분·설명은 관리자 화면에서 한 번만 입력하세요.']]),ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:34},{wch:20},{wch:20},{wch:18},{wch:36}];XLSX.utils.book_append_sheet(wb,guide,'입력 안내');XLSX.utils.book_append_sheet(wb,ws,'추천도서 입력');return XLSX.write(wb,{type:'buffer',bookType:'xlsx'});}
function hash32(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function pickBySeed(arr,count,seed){return [...arr].map((x,i)=>({x,k:hash32(`${seed}|${x.id||x.bookId||x.title||i}|${i}`)})).sort((a,b)=>a.k-b.k).slice(0,count).map(v=>v.x);}
async function hydrateLists(lists){
 const needsIndex=lists.some(l=>(l.items||[]).some(x=>x.bookId&&!x.book));
 let map=null;
 if(needsIndex){const idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});map=new Map((idx?.records||[]).map(r=>[r.id,r]));}
 return lists.map(l=>({...l,items:(l.items||[]).filter(x=>x.bookId&&(x.book||map?.has(x.bookId))).map(x=>({...x,book:x.book||(map?.has(x.bookId)?publicBook(map.get(x.bookId)):null)})).filter(x=>x.book)})).filter(l=>l.items.length);
}
export default async function handler(req,res){
 try{
  const mode=String(req.query?.mode||'active'),action=String(req.query?.action||'');
  if(req.method==='GET'&&mode==='home'){
   const doc=await readJson(PATHS.recommendations,EMPTY,{ttlMs:60*1000});
   let lists=sortLists((doc.lists||[]).filter(x=>isVisible(x)&&x.featured));
   if(!lists.length){res.setHeader('Cache-Control','no-store, max-age=0');return res.status(200).json({ok:true,lists:[]});}
   lists=await hydrateLists(lists);
   const seed=s(req.query?.seed||'home');
   const selected=lists.slice(0,2).map(l=>{const totalItems=(l.items||[]).length;return {...l,totalItems,hasMore:totalItems>5,items:pickBySeed(l.items,5,`${seed}|${l.id}`)};});
   res.setHeader('Cache-Control','no-store, max-age=0');
   return res.status(200).json({ok:true,lists:selected});
  }
  if(req.method==='GET'&&mode==='list'){
   const listId=s(req.query?.id),doc=await readJson(PATHS.recommendations,EMPTY,{ttlMs:60*1000});
   let lists=(doc.lists||[]).filter(x=>x.id===listId&&isVisible(x));
   lists=await hydrateLists(lists);if(!lists.length)return res.status(404).json({ok:false,message:'추천목록을 찾지 못했습니다.'});
   res.setHeader('Cache-Control','no-store, max-age=0');
   return res.status(200).json({ok:true,list:lists[0]});
  }
  if(req.method==='GET'&&mode==='active'){
   const doc=await readJson(PATHS.recommendations,EMPTY,{ttlMs:60*1000});const lists=await hydrateLists(sortLists((doc.lists||[]).filter(isVisible)));return res.status(200).json({ok:true,lists});
  }
  if(req.method==='GET'&&mode==='template'){
   if(!requireAdmin(req,res))return;const buf=templateBuffer();res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="recommendation-template.xlsx"');return res.status(200).send(buf);
  }
  if(req.method==='GET'&&mode==='admin'){
   if(!requireAdmin(req,res))return;res.setHeader('Cache-Control','no-store, max-age=0');const doc=await readJson(PATHS.recommendations,EMPTY);return res.status(200).json({ok:true,types:TYPES,lists:normalizeOrders(doc.lists||[])});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});if(!requireAdmin(req,res))return;
  const doc=await readJson(PATHS.recommendations,EMPTY);doc.lists=Array.isArray(doc.lists)?doc.lists:[];
  if(action==='save'){
   const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});if(!s(body.name))return res.status(400).json({ok:false,message:'추천목록 이름을 입력해 주세요.'});const at=doc.lists.findIndex(x=>x.id===body.id);const next=safeList(body,at>=0?doc.lists[at]:{});if(at>=0)doc.lists[at]=next;else doc.lists.unshift(next);doc.updatedAt=new Date().toISOString();await writeJson(PATHS.recommendations,doc);await addHistory('recommendation','추천목록 저장',{name:next.name});return res.status(200).json({ok:true,message:'추천목록을 저장했습니다.',list:next});
  }

  if(action==='reorder'){
   const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),rid=s(body.id),dir=body.direction==='up'?'up':'down';
   doc.lists=normalizeOrders(doc.lists||[]);const at=doc.lists.findIndex(x=>x.id===rid);if(at<0)return res.status(404).json({ok:false,message:'추천목록을 찾지 못했습니다.'});const to=dir==='up'?at-1:at+1;if(to<0||to>=doc.lists.length)return res.status(200).json({ok:true,message:'더 이상 이동할 수 없습니다.',lists:doc.lists});
   [doc.lists[at],doc.lists[to]]=[doc.lists[to],doc.lists[at]];doc.lists=doc.lists.map((x,i)=>({...x,displayOrder:i+1,updatedAt:new Date().toISOString()}));doc.updatedAt=new Date().toISOString();await writeJson(PATHS.recommendations,doc);await addHistory('recommendation','추천목록 노출 순서 변경',{id:rid,direction:dir});return res.status(200).json({ok:true,message:'노출 순서를 변경했습니다.',lists:doc.lists});
  }
  if(action==='delete'){
   const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const before=doc.lists.length;doc.lists=doc.lists.filter(x=>x.id!==body.id);if(doc.lists.length===before)return res.status(404).json({ok:false,message:'추천목록을 찾지 못했습니다.'});doc.updatedAt=new Date().toISOString();await writeJson(PATHS.recommendations,doc);await addHistory('recommendation','추천목록 삭제',{id:body.id});return res.status(200).json({ok:true,message:'추천목록을 삭제했습니다.'});
  }
  if(action==='upload'){
   const listId=s(req.query?.listId),at=doc.lists.findIndex(x=>x.id===listId);if(at<0)return res.status(404).json({ok:false,message:'먼저 추천목록을 저장해 주세요.'});const buf=await bodyBuffer(req);if(!buf.length)throw new Error('엑셀 파일을 읽지 못했습니다.');if(buf.length>2_000_000)throw new Error('추천도서 엑셀은 2MB 이하로 사용해 주세요.');const rows=parseRows(buf),idx=await readJson(PATHS.searchIndex,null,{ttlMs:5*60*1000});if(!idx?.records)throw new Error('검색 인덱스가 준비되지 않았습니다.');const items=matchRows(rows,idx);doc.lists[at]={...doc.lists[at],items,updatedAt:new Date().toISOString()};doc.updatedAt=new Date().toISOString();await writeJson(PATHS.recommendations,doc);await addHistory('recommendation','추천도서 엑셀 업로드',{name:doc.lists[at].name,total:items.length});const owned=items.filter(x=>x.matchStatus==='소장').length;return res.status(200).json({ok:true,message:`총 ${items.length}종 중 소장 ${owned}종 · 미소장 ${items.length-owned}종을 확인했습니다.`,total:items.length,owned,notOwned:items.length-owned,items});
  }
  return res.status(400).json({ok:false,message:'알 수 없는 작업입니다.'});
 }catch(e){return res.status(500).json({ok:false,message:'추천도서 처리 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
