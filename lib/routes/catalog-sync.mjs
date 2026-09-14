import * as XLSX from 'xlsx';
import { get, put } from '@vercel/blob';
import { PATHS, readJson, writeJson } from '../storage.mjs';
import { addHistory } from '../history.mjs';
import { requireAdmin } from '../admin-auth.mjs';

const CATALOG_PATH = PATHS.catalog;
const STATE_PATH = PATHS.state;
const IMPORTS_PATH = PATHS.catalogImports;
const ACTIVE = new Set(['대출가능','대출중','비치도서']);
const EXCLUDED = new Set(['분실','파손','소재불명','가치상실']);
const TEMPLATE_COLUMNS=['NO','자료유형','등록번호','자료명','저자','출판사','출판년도','청구기호','등록일','자료상태','소장처','ISBN'];
const HEADER_ALIASES={
  'NO':['no','번호','순번'],
  '자료유형':['자료유형','자료형태','자료구분','유형'],
  '등록번호':['등록번호','등록번호1','도서등록번호'],
  '자료명':['자료명','서명','도서명','제목'],
  '저자':['저자','저자명','지은이'],
  '출판사':['출판사','발행처','출판처'],
  '출판년도':['출판년도','발행년도','출판년','발행년'],
  '청구기호':['청구기호','분류기호','청구번호'],
  '등록일':['등록일','등록일자'],
  '자료상태':['자료상태','상태','도서상태'],
  '소장처':['소장처','소장위치','소장장소'],
  'ISBN':['isbn','isbn13','isbn-13','국제표준도서번호']
};
function s(v){ return v == null ? '' : String(v).trim(); }
function norm(v){ return s(v).replace(/\s+/g,' ').trim(); }
function headerNorm(v){return s(v).normalize('NFKC').toLowerCase().replace(/[\s_()\[\]{}:·.\-/]/g,'');}
function isbn(v){ const x=s(v).replace(/[^0-9Xx]/g,''); return x.length>=10 ? x : ''; }
function kdc(call){ const m=s(call).match(/(^|\s)(\d{3}(?:\.\d+)?)(?=\s|$)/); return m ? m[2] : ''; }
function keyOf(b){ const i=isbn(b.identity?.isbn13); if(i) return `i:${i}`; return `t:${norm(b.identity?.title).toLowerCase()}|a:${norm(b.identity?.author).toLowerCase()}`; }
function rowKey(r){ const i=isbn(r.ISBN); if(i) return `i:${i}`; return `t:${norm(r['자료명']).toLowerCase()}|a:${norm(r['저자']).toLowerCase()}`; }
function uniq(a){ return [...new Set(a.filter(Boolean))]; }
function dateValue(v){ const x=norm(v).replace(/[.\/]/g,'-').replace(/\s+/g,''); const m=x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''; }
function latestDate(a){ return uniq(a.map(dateValue)).sort().pop()||''; }
function blankExternal(){ return { yes24:{status:'not_enriched',cover:null,introduction:null,toc:null,pages:null}, nlk:{status:'not_enriched'} }; }
function blankProfile(){ return {materialType:null,genres:[],primaryTopics:[],secondaryTopics:[],emotions:[],curriculumFields:[],careerFields:[],literatureOrigin:null,settingPlaces:[],timePeriods:[],audience:null,difficulty:null,searchTerms:[],exclusions:[]}; }
function blankQuality(){ return {baseProfileReady:true,externalMetadataReady:false,aiEnriched:false,needsAiReview:null,confidence:'base',sources:['DLS holdings sync'],profileSchema:'1.0'}; }
function importId(){return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;}
function snapshotPath(id){return `${PATHS.catalogSnapshotRoot}/${id}.json`;}
function decodeFilename(v){try{return decodeURIComponent(String(v||''));}catch{return String(v||'');}}

async function bodyBuffer(req){
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks=[]; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)); return Buffer.concat(chunks);
}
async function readJsonBlob(path){ const x=await get(path,{access:'private',useCache:false}); if(!x?.stream) throw new Error(`${path}를 읽지 못했습니다.`); return JSON.parse(await new Response(x.stream).text()); }
function aliasLookup(){const m=new Map();for(const [canon,aliases] of Object.entries(HEADER_ALIASES)){m.set(headerNorm(canon),canon);for(const a of aliases)m.set(headerNorm(a),canon);}return m;}
const HEADER_LOOKUP=aliasLookup();
function canonicalizeRows(rawRows){return rawRows.map(raw=>{const row={};for(const [k,v] of Object.entries(raw)){const canon=HEADER_LOOKUP.get(headerNorm(k))||k;if(row[canon]===undefined||row[canon]==='')row[canon]=v;}return row;});}
function parseRows(buf){
  const wb=XLSX.read(buf,{type:'buffer'}); const ws=wb.Sheets['리스트 반출'] || wb.Sheets['도서 데이터 입력'] || wb.Sheets[wb.SheetNames[0]];
  if(!ws) throw new Error('엑셀 시트를 찾지 못했습니다.');
  const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
  const rows=canonicalizeRows(raw);
  const cols=new Set(rows.length?Object.keys(rows[0]):[]); const required=['자료명','저자','출판사','출판년도','청구기호','자료상태','소장처','ISBN'];
  const missing=required.filter(x=>!cols.has(x));
  if(missing.length) throw new Error(`도서 데이터 형식을 확인해 주세요. 없는 열: ${missing.join(', ')}. 관리자 화면의 표준 양식을 사용하면 가장 안전합니다.`);
  return rows;
}
function templateBuffer(){
  const example=[{'NO':1,'자료유형':'도서','등록번호':'EM00000001','자료명':'예시 도서','저자':'홍길동','출판사':'예시출판사','출판년도':'2026','청구기호':'400 홍12ㅇ','등록일':'2026-09-14','자료상태':'대출가능','소장처':'성의고등학교 도서관','ISBN':'9780000000000'}];
  const wb=XLSX.utils.book_new();
  const guide=XLSX.utils.aoa_to_sheet([
    ['도서 데이터 업로드 안내'],
    ['사용 순서','독서로에서 내려받은 목록을 그대로 사용하거나, 이 양식에 붙여 넣은 뒤 관리자에서 먼저 비교하세요.'],
    ['표준 열 순서',TEMPLATE_COLUMNS.join(' → ')],
    ['권장','등록번호와 ISBN이 있으면 중복·매칭 확인이 더 정확합니다.'],
    ['안전 장치','업로드 후 바로 반영되지 않습니다. 비교 결과를 확인한 뒤 “서버에 반영”을 눌러야 합니다.'],
    ['자료상태','분실·파손·소재불명·가치상실은 현존 장서에서 제외됩니다.']
  ]);
  const ws=XLSX.utils.json_to_sheet(example,{header:TEMPLATE_COLUMNS});
  ws['!cols']=[{wch:7},{wch:12},{wch:15},{wch:34},{wch:22},{wch:20},{wch:12},{wch:20},{wch:13},{wch:14},{wch:24},{wch:18}];
  XLSX.utils.book_append_sheet(wb,guide,'입력 안내');
  XLSX.utils.book_append_sheet(wb,ws,'도서 데이터 입력');
  return XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
}
function inputQuality(rows){
  const regSeen=new Set(),dupRegs=new Set();let invalidRows=0;
  for(const r of rows){if(!norm(r['자료명']))invalidRows++;const reg=norm(r['등록번호']);if(reg){if(regSeen.has(reg))dupRegs.add(reg);regSeen.add(reg);}}
  return {validRows:Math.max(0,rows.length-invalidRows),invalidRows,duplicateRegistrations:dupRegs.size};
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
    holding:{copies:g.rows.length,registrationNumbers:regs,callNumbers:calls,locations:locs,latestRegistrationDate:latestDate(g.rows.map(r=>r['등록일']))||old?.holding?.latestRegistrationDate||'',kdc:kd || old?.holding?.kdc || '',kdcMajor:(kd || old?.holding?.kdc)?String(kd || old?.holding?.kdc)[0]+'00':''},
    external: old?.external || blankExternal(), profile: old?.profile || blankProfile(),
    quality:{...(old?.quality||blankQuality()),baseProfileReady:true,sources:uniq([...(old?.quality?.sources||[]),'DLS holdings sync'])}
  };
}
function nextId(n){ return `b${String(n).padStart(5,'0')}`; }
function comparableHolding(h){return {copies:Number(h?.copies||0),callNumbers:uniq((h?.callNumbers||[]).map(norm)).sort(),locations:uniq((h?.locations||[]).map(norm)).sort()};}
function sameIdentity(a,b){return norm(a?.identity?.title)===norm(b?.identity?.title)&&norm(a?.identity?.author)===norm(b?.identity?.author)&&norm(a?.identity?.publisher)===norm(b?.identity?.publisher)&&norm(a?.identity?.year)===norm(b?.identity?.year)&&isbn(a?.identity?.isbn13)===isbn(b?.identity?.isbn13);}
function summarize(oldBooks,newBooks,mode,rows){
  const om=new Map(oldBooks.map(b=>[keyOf(b),b])), nm=new Map(newBooks.map(b=>[keyOf(b),b]));
  let added=0,removed=0,changed=0,unchanged=0;const addedExamples=[],removedExamples=[],changedExamples=[];
  for(const [k,b] of nm){const o=om.get(k);if(!o){added++;if(addedExamples.length<8)addedExamples.push(b.identity.title);continue;}const holdingSame=JSON.stringify(comparableHolding(o.holding))===JSON.stringify(comparableHolding(b.holding));if(!holdingSame||!sameIdentity(o,b)){changed++;if(changedExamples.length<8)changedExamples.push(b.identity.title);}else unchanged++;}
  for(const [k,b] of om){if(!nm.has(k)){removed++;if(removedExamples.length<8)removedExamples.push(b.identity.title);}}
  return {version:'V9.0',mode,inputRows:rows.length,resultTitles:newBooks.length,added,changed,removed,unchanged,inputQuality:inputQuality(rows),examples:{added:addedExamples,changed:changedExamples,removed:removedExamples}};
}
function fullSync(oldCatalog, rows){const groups=groupRows(activeRows(rows));const oldMap=new Map(oldCatalog.books.map(b=>[keyOf(b),b]));let seq=oldCatalog.books.length+1;const books=[];for(const [k,g] of groups){const old=oldMap.get(k);books.push(buildFromGroup(g,old,nextId(seq++)));}return {...oldCatalog,generatedAt:new Date().toISOString(),bookCount:books.length,books};}
function addOnly(oldCatalog, rows){
  const groups=groupRows(activeRows(rows)); const books=structuredClone(oldCatalog.books); const map=new Map(books.map((b,i)=>[keyOf(b),i])); let seq=books.length+1;
  for(const [k,g] of groups){
    if(!map.has(k)){const b=buildFromGroup(g,null,nextId(seq++));books.push(b);map.set(k,books.length-1);continue;}
    const i=map.get(k),old=books[i];const oldRegs=new Set(old.holding?.registrationNumbers||[]),incomingRegs=uniq(g.rows.map(r=>norm(r['등록번호']))),knownRegs=incomingRegs.filter(x=>oldRegs.has(x));
    const addCount=oldRegs.size?Math.max(0,g.rows.length-knownRegs.length):g.rows.length;
    const calls=uniq([...(old.holding?.callNumbers||[]),...g.rows.map(r=>norm(r['청구기호']))]),locs=uniq([...(old.holding?.locations||[]),...g.rows.map(r=>norm(r['소장처']))]);
    const incomingLatest=latestDate(g.rows.map(r=>r['등록일'])),previousLatest=old.holding?.latestRegistrationDate||'';
    books[i]={...old,identity:{...old.identity,publisher:old.identity.publisher||g.publisher,year:old.identity.year||g.year,isbn13:old.identity.isbn13||g.isbn13},holding:{...old.holding,copies:Number(old.holding?.copies||0)+addCount,registrationNumbers:uniq([...(old.holding?.registrationNumbers||[]),...incomingRegs]),callNumbers:calls,locations:locs,latestRegistrationDate:[previousLatest,incomingLatest].filter(Boolean).sort().pop()||''}};
  }
  return {...oldCatalog,generatedAt:new Date().toISOString(),bookCount:books.length,books};
}
async function updateStateForCatalog(catalog,mode='rollback'){
  try{const state=await readJsonBlob(STATE_PATH);state.catalog={...(state.catalog||{}),expectedGroupedTitles:catalog.bookCount,lastSyncedAt:new Date().toISOString(),lastSyncMode:mode};await put(STATE_PATH,JSON.stringify(state,null,2),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});}catch{}
}
async function getImportDoc(){return await readJson(IMPORTS_PATH,{version:'1.0',updatedAt:null,records:[]});}

export default async function handler(req,res){
  try{
    const mode=String(req.query?.mode||'');const action=String(req.query?.action||'');
    if(req.method==='GET'&&mode==='template'){
      if(!requireAdmin(req,res))return;const buf=templateBuffer();res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="catalog-upload-template.xlsx"');return res.status(200).send(buf);
    }
    if(req.method==='GET'&&mode==='history'){
      if(!requireAdmin(req,res))return;const [doc,catalog,state]=await Promise.all([getImportDoc(),readJson(CATALOG_PATH,{books:[]}),readJson(STATE_PATH,{})]);const records=[...(doc.records||[])];
      if(!records.some(x=>x.syntheticBaseline)){records.push({id:'baseline',syntheticBaseline:true,at:catalog.generatedAt||state?.catalog?.lastSyncedAt||null,fileName:'기존 기준 장서 데이터',mode:'baseline',inputRows:null,resultTitles:catalog.books?.length||catalog.bookCount||0,added:null,changed:null,removed:null,unchanged:null,rollbackAvailable:false});}
      const latestApplied=(doc.records||[]).find(x=>!x.rolledBackAt);for(const r of records)r.rollbackAvailable=!!(latestApplied&&r.id===latestApplied.id&&r.snapshotPath&&!r.rolledBackAt);
      return res.status(200).json({ok:true,currentTitles:catalog.books?.length||catalog.bookCount||0,lastUpdatedAt:state?.catalog?.lastSyncedAt||catalog.generatedAt||null,records});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});
    if(!requireAdmin(req,res))return;
    if(action==='rollback'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),id=s(body.id),doc=await getImportDoc(),latest=(doc.records||[]).find(x=>!x.rolledBackAt);
      if(!latest||latest.id!==id||!latest.snapshotPath)return res.status(400).json({ok:false,message:'안전을 위해 가장 최근 반영 작업만 되돌릴 수 있습니다.'});
      const previous=await readJsonBlob(latest.snapshotPath);await put(CATALOG_PATH,JSON.stringify(previous),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});await updateStateForCatalog(previous,'rollback');latest.rolledBackAt=new Date().toISOString();doc.updatedAt=latest.rolledBackAt;await writeJson(IMPORTS_PATH,doc);await addHistory('catalog','장서자료 업데이트 되돌리기',{importId:id,resultTitles:previous.books?.length||previous.bookCount||0});return res.status(200).json({ok:true,message:`직전 데이터로 되돌렸습니다. 현재 ${(previous.books?.length||previous.bookCount||0).toLocaleString()}종입니다. 검색 인덱스는 관리자에서 다시 구축해 주세요.`});
    }
    const syncMode=req.query?.mode==='add'?'add':'full';const syncAction=req.query?.action==='commit'?'commit':'preview';
    const buf=await bodyBuffer(req);if(!buf.length)throw new Error('업로드한 엑셀 파일을 읽지 못했습니다.');if(buf.length>6_000_000)throw new Error('엑셀 파일이 6MB를 넘습니다. 파일을 나누어 주세요.');
    const rows=parseRows(buf),oldCatalog=await readJsonBlob(CATALOG_PATH),newCatalog=syncMode==='full'?fullSync(oldCatalog,rows):addOnly(oldCatalog,rows),summary=summarize(oldCatalog.books,newCatalog.books,syncMode,rows);
    if(syncAction==='preview')return res.status(200).json({ok:true,...summary,message:'비교가 끝났습니다. 아직 서버 데이터는 변경하지 않았습니다.'});
    const id=importId(),snap=snapshotPath(id),fileName=decodeFilename(req.headers['x-upload-filename'])||'도서 데이터.xlsx';
    await put(snap,JSON.stringify(oldCatalog),{access:'private',allowOverwrite:false,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});
    const blob=await put(CATALOG_PATH,JSON.stringify(newCatalog),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});
    try{const state=await readJsonBlob(STATE_PATH);state.catalog={...(state.catalog||{}),pathname:blob.pathname,etag:blob.etag,expectedGroupedTitles:newCatalog.bookCount,lastSyncedAt:new Date().toISOString(),lastSyncMode:syncMode};await put(STATE_PATH,JSON.stringify(state,null,2),{access:'private',allowOverwrite:true,contentType:'application/json; charset=utf-8',cacheControlMaxAge:60});}catch{}
    const doc=await getImportDoc(),record={id,at:new Date().toISOString(),fileName,mode:syncMode,inputRows:summary.inputRows,resultTitles:newCatalog.bookCount,added:summary.added,changed:summary.changed,removed:summary.removed,unchanged:summary.unchanged,inputQuality:summary.inputQuality,snapshotPath:snap,rolledBackAt:null};doc.records=[record,...(doc.records||[])].slice(0,50);doc.updatedAt=record.at;await writeJson(IMPORTS_PATH,doc);
    await addHistory('catalog','장서자료 동기화',{mode:syncMode,fileName,added:summary.added,changed:summary.changed,removed:summary.removed,resultTitles:newCatalog.bookCount});
    return res.status(200).json({ok:true,...summary,message:`저장 완료: 현재 ${newCatalog.bookCount.toLocaleString()}종의 장서가 서버 영구 저장소에 있습니다. 검색 반영을 위해 통합 구축을 실행해 주세요.`,importId:id});
  }catch(e){return res.status(500).json({ok:false,code:'CATALOG_SYNC_FAILED',message:'장서 동기화 처리 중 오류가 발생했습니다.',detail:String(e?.stack||e?.message||e)});}
}
