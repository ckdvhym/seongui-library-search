import * as XLSX from 'xlsx';
import { get, put } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

const CATALOG_PATH = 'schools/seongui-high/catalog/base-catalog.json';
const STATE_PATH = 'schools/seongui-high/state/system-state.json';
const CODE_VERSION = 'V5.4.1';
const ACTIVE = new Set(['대출가능','대출중','비치도서']);
const EXCLUDED = new Set(['분실','파손','소재불명','가치상실']);

function s(v){ return v == null ? '' : String(v).trim(); }
function norm(v){ return s(v).replace(/\s+/g,' ').trim(); }
function isbn(v){ const x=s(v).replace(/[^0-9Xx]/g,''); return x.length>=10 ? x : ''; }
function kdc(call){ const m=s(call).match(/(^|\s)(\d{3}(?:\.\d+)?)(?=\s|$)/); return m ? m[2] : ''; }
function keyOf(b){ const i=isbn(b.identity?.isbn13); if(i) return `i:${i}`; return `t:${norm(b.identity?.title).toLowerCase()}|a:${norm(b.identity?.author).toLowerCase()}`; }
function rowKey(r){ const i=isbn(r.ISBN); if(i) return `i:${i}`; return `t:${norm(r['자료명']).toLowerCase()}|a:${norm(r['저자']).toLowerCase()}`; }
function uniq(a){ return [...new Set(a.filter(Boolean))]; }
function blankExternal(){ return { yes24:{status:'not_enriched',cover:null,introduction:null,toc:null,pages:null}, nlk:{status:'not_enriched'} }; }
function blankProfile(){ return {materialType:null,genres:[],primaryTopics:[],secondaryTopics:[],emotions:[],curriculumFields:[],careerFields:[],literatureOrigin:null,settingPlaces:[],timePeriods:[],audience:null,difficulty:null,searchTerms:[],exclusions:[]}; }
function blankQuality(){ return {baseProfileReady:true,externalMetadataReady:false,aiEnriched:false,needsAiReview:null,confidence:'base',sources:['DLS holdings sync'],profileSchema:'1.0'}; }

async function bodyBuffer(req){
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks=[]; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)); return Buffer.concat(chunks);
}
async function readJsonBlob(path){ const x=await get(path,{access:'private',useCache:false}); if(!x?.stream) throw new Error(`${path}를 읽지 못했습니다.`); return JSON.parse(await new Response(x.stream).text()); }
function parseRows(buf){
  const wb=XLSX.read(buf,{type:'buffer'}); const ws=wb.Sheets['리스트 반출'] || wb.Sheets[wb.SheetNames[0]];
  if(!ws) throw new Error('엑셀 시트를 찾지 못했습니다.');
  const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
  const required=['자료명','저자','출판사','출판년도','청구기호','자료상태','소장처','ISBN'];
  const cols=new Set(rows.length?Object.keys(rows[0]):[]); const missing=required.filter(x=>!cols.has(x));
  if(missing.length) throw new Error(`DLS 엑셀 형식을 확인해 주세요. 없는 열: ${missing.join(', ')}`);
  return rows;
}
function activeRows(rows){ return rows.filter(r=>{ const st=norm(r['자료상태']); return !EXCLUDED.has(st) && (ACTIVE.has(st) || !st); }); }
function groupRows(rows){
  const map=new Map();
  for(const r of rows){
    if(!norm(r['자료명'])) continue; const k=rowKey(r);
    if(!map.has(k)) map.set(k,{rows:[],title:norm(r['자료명']),author:norm(r['저자']),publisher:norm(r['출판사']),year:norm(r['출판년도']),isbn13:isbn(r.ISBN)});
    map.get(k).rows.push(r);
  }
  return map;
}
function buildFromGroup(g, old, id){
  const regs=uniq(g.rows.map(r=>norm(r['등록번호'])));
  const calls=uniq(g.rows.map(r=>norm(r['청구기호']))); const locs=uniq(g.rows.map(r=>norm(r['소장처']))); const kd=kdc(calls[0]);
  return {
    id: old?.id || id,
    identity:{title:g.title,author:g.author,publisher:g.publisher,year:g.year,isbn13:g.isbn13},
    holding:{copies:g.rows.length,registrationNumbers:regs,callNumbers:calls,locations:locs,kdc:kd || old?.holding?.kdc || '',kdcMajor:(kd || old?.holding?.kdc)?String(kd || old?.holding?.kdc)[0]+'00':''},
    external: old?.external || blankExternal(), profile: old?.profile || blankProfile(),
    quality:{...(old?.quality||blankQuality()),baseProfileReady:true,sources:uniq([...(old?.quality?.sources||[]),'DLS holdings sync'])}
  };
}
function nextId(n){ return `b${String(n).padStart(5,'0')}`; }
function comparableHolding(h){
  // V5 최초 카탈로그에는 등록번호가 없었으므로 등록번호 추가 자체를 '장서 변경'으로 세지 않는다.
  // 실제 이용자 관점의 소장 변화(권수/청구기호/소장처)만 비교한다.
  return {
    copies:Number(h?.copies||0),
    callNumbers:uniq((h?.callNumbers||[]).map(norm)).sort(),
    locations:uniq((h?.locations||[]).map(norm)).sort()
  };
}
function sameIdentity(a,b){
  return norm(a?.identity?.title)===norm(b?.identity?.title) &&
    norm(a?.identity?.author)===norm(b?.identity?.author) &&
    norm(a?.identity?.publisher)===norm(b?.identity?.publisher) &&
    norm(a?.identity?.year)===norm(b?.identity?.year) &&
    isbn(a?.identity?.isbn13)===isbn(b?.identity?.isbn13);
}
function summarize(oldBooks,newBooks,mode,rows){
  const om=new Map(oldBooks.map(b=>[keyOf(b),b])), nm=new Map(newBooks.map(b=>[keyOf(b),b]));
  let added=0,removed=0,changed=0,unchanged=0;
  const addedExamples=[],removedExamples=[],changedExamples=[];
  for(const [k,b] of nm){
    const o=om.get(k);
    if(!o){added++; if(addedExamples.length<8) addedExamples.push(b.identity.title); continue;}
    const holdingSame=JSON.stringify(comparableHolding(o.holding))===JSON.stringify(comparableHolding(b.holding));
    if(!holdingSame || !sameIdentity(o,b)){changed++;if(changedExamples.length<8)changedExamples.push(b.identity.title);} else unchanged++;
  }
  for(const [k,b] of om){ if(!nm.has(k)){removed++;if(removedExamples.length<8)removedExamples.push(b.identity.title);} }
  return {version:'V5.4.1',mode,inputRows:rows.length,resultTitles:newBooks.length,added,changed,removed,unchanged,examples:{added:addedExamples,changed:changedExamples,removed:removedExamples}};
}
function fullSync(oldCatalog, rows){
  const groups=groupRows(activeRows(rows)); const oldMap=new Map(oldCatalog.books.map(b=>[keyOf(b),b])); let seq=oldCatalog.books.length+1; const books=[];
  for(const [k,g] of groups){ const old=oldMap.get(k); books.push(buildFromGroup(g,old,nextId(seq++))); }
  return {...oldCatalog,generatedAt:new Date().toISOString(),bookCount:books.length,books};
}
function addOnly(oldCatalog, rows){
  const groups=groupRows(activeRows(rows)); const books=structuredClone(oldCatalog.books); const map=new Map(books.map((b,i)=>[keyOf(b),i])); let seq=books.length+1;
  for(const [k,g] of groups){
    if(!map.has(k)){ const b=buildFromGroup(g,null,nextId(seq++)); books.push(b); map.set(k,books.length-1); continue; }
    const i=map.get(k), old=books[i]; const oldRegs=new Set(old.holding?.registrationNumbers||[]); const incomingRegs=uniq(g.rows.map(r=>norm(r['등록번호'])));
    const knownRegs=incomingRegs.filter(x=>oldRegs.has(x));
    // 등록번호가 이미 저장된 행은 재업로드로 보고 제외. 기존 카탈로그에 등록번호가 전혀 없으면 신규도서 파일의 모든 행을 새 복본으로 인정.
    const addCount=oldRegs.size ? Math.max(0,g.rows.length-knownRegs.length) : g.rows.length;
    const calls=uniq([...(old.holding?.callNumbers||[]),...g.rows.map(r=>norm(r['청구기호']))]);
    const locs=uniq([...(old.holding?.locations||[]),...g.rows.map(r=>norm(r['소장처']))]);
    books[i]={...old,identity:{...old.identity,publisher:old.identity.publisher||g.publisher,year:old.identity.year||g.year,isbn13:old.identity.isbn13||g.isbn13},holding:{...old.holding,copies:Number(old.holding?.copies||0)+addCount,registrationNumbers:uniq([...(old.holding?.registrationNumbers||[]),...incomingRegs]),callNumbers:calls,locations:locs}};
  }
  return {...oldCatalog,generatedAt:new Date().toISOString(),bookCount:books.length,books};
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'POST 요청만 허용됩니다.'});
  if(!requireAdmin(req,res)) return;
  try{
    const mode=req.query?.mode==='add'?'add':'full'; const action=req.query?.action==='commit'?'commit':'preview';
    const buf=await bodyBuffer(req); if(!buf.length) throw new Error('업로드한 엑셀 파일을 읽지 못했습니다.'); if(buf.length>4_000_000) throw new Error('엑셀 파일이 4MB를 넘습니다. 파일을 나누어 주세요.');
    const rows=parseRows(buf); const oldCatalog=await readJsonBlob(CATALOG_PATH); const newCatalog=mode==='full'?fullSync(oldCatalog,rows):addOnly(oldCatalog,rows); const summary=summarize(oldCatalog.books,newCatalog.books,mode,rows);
    if(action==='preview') return res.status(200).json({ok:true,...summary,message:'비교가 끝났습니다. 아직 서버 데이터는 변경하지 않았습니다.'});
    const blob=await put(CATALOG_PATH,JSON.stringify(newCatalog),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});
    try{ const state=await readJsonBlob(STATE_PATH); state.catalog={...(state.catalog||{}),pathname:blob.pathname,etag:blob.etag,expectedGroupedTitles:newCatalog.bookCount,lastSyncedAt:new Date().toISOString(),lastSyncMode:mode}; await put(STATE_PATH,JSON.stringify(state,null,2),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60}); }catch{}
    return res.status(200).json({ok:true,...summary,message:`저장 완료: 현재 ${newCatalog.bookCount.toLocaleString()}종의 장서가 서버 영구 저장소에 있습니다.`});
  }catch(e){ return res.status(500).json({ok:false,code:'CATALOG_SYNC_FAILED',message:'장서 동기화 처리 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)}); }
}
