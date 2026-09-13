import { readJson, writeJson, PATHS } from '../storage.mjs';
import { requireAdmin } from '../admin-auth.mjs';
import { addHistory } from '../history.mjs';
const DEFAULT_DLS='https://read365.edunet.net/PureScreen/SchoolSearch?schoolName=%EC%84%B1%EC%9D%98%EA%B3%A0%EB%93%B1%ED%95%99%EA%B5%90&provCode=R10&neisCode=R100000855';
const DEFAULTS={
 schoolName:'성의고등학교 도서관',
 homeTitle:'성의고등학교 도서관 자료 검색',
 logoDataUrl:'',dlsUrl:DEFAULT_DLS,accentColor:'#4f6ed6',
 features:{browse:false,recommendations:true,searchSuggestions:true,relatedTopics:true,relatedBooks:true,newBooks:true,eventBanner:false},
 event:{enabled:false,title:'',description:'',url:''},
 footerNotice:{enabled:true,text:'Beta · 성의고등학교 도서관에서 직접 만들고 계속 다듬어 가는 검색 서비스입니다. 검색 결과가 완벽하지 않을 수 있습니다.'}
};
function safeHex(v){const x=String(v||'');return /^#[0-9a-fA-F]{6}$/.test(x)?x:DEFAULTS.accentColor;}
function safeUrl(v){try{const u=new URL(String(v||''));return /^https?:$/.test(u.protocol)?u.toString():DEFAULT_DLS;}catch{return DEFAULT_DLS;}}
function safeFeatures(v={}){const out={};for(const k of Object.keys(DEFAULTS.features))out[k]=v[k]===undefined?DEFAULTS.features[k]:!!v[k];return out;}
function safeSettings(v={}){return {
 schoolName:String(v.schoolName||DEFAULTS.schoolName).slice(0,80),homeTitle:String(v.homeTitle||DEFAULTS.homeTitle).slice(0,100),
 logoDataUrl:/^data:image\/(png|jpeg|webp);base64,/i.test(String(v.logoDataUrl||''))?String(v.logoDataUrl):'',
 dlsUrl:safeUrl(v.dlsUrl),accentColor:safeHex(v.accentColor),features:safeFeatures(v.features||{}),
 event:{enabled:!!v.event?.enabled,title:String(v.event?.title||'').slice(0,80),description:String(v.event?.description||'').slice(0,220),url:v.event?.url?safeUrl(v.event.url):''},
 footerNotice:{enabled:v.footerNotice?.enabled===undefined?DEFAULTS.footerNotice.enabled:!!v.footerNotice.enabled,text:String(v.footerNotice?.text||DEFAULTS.footerNotice.text).slice(0,220)}
};}
export default async function handler(req,res){
 if(req.method==='GET'){const current=await readJson(PATHS.schoolSettings,DEFAULTS,{ttlMs:5*60*1000});return res.status(200).json({ok:true,...safeSettings(current)});}
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'GET/POST only'});
 if(!requireAdmin(req,res))return;
 try{const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const prev=await readJson(PATHS.schoolSettings,DEFAULTS);const next=safeSettings({...prev,...body,features:{...(prev?.features||{}),...(body?.features||{})},event:{...(prev?.event||{}),...(body?.event||{})},footerNotice:{...(prev?.footerNotice||{}),...(body?.footerNotice||{})}});if(next.logoDataUrl.length>280000)return res.status(413).json({ok:false,message:'로고 이미지가 너무 큽니다. 200KB 이하의 PNG/JPG/WebP 이미지를 사용해 주세요.'});await writeJson(PATHS.schoolSettings,next);await addHistory('settings','학교·화면 설정 변경',{features:next.features,accentColor:next.accentColor});return res.status(200).json({ok:true,message:'학교·화면 설정을 저장했습니다.',...next});}catch(e){return res.status(500).json({ok:false,message:'학교 설정 저장 중 오류가 발생했습니다.',detail:String(e?.message||e)});}
}
