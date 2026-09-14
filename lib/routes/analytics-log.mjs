import {logSearch} from '../analytics.mjs';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,message:'POST only'});
 try{const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const q=String(body.q||'').trim();const total=Math.max(0,Math.min(50000,Number(body.total||0)||0));if(!q||q.length>100)return res.status(400).json({ok:false,message:'잘못된 검색 기록입니다.'});await logSearch(q,total,{expanded:!!body.expanded});return res.status(200).json({ok:true});}catch{return res.status(200).json({ok:true});}
}
