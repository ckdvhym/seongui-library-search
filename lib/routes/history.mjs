import {requireAdmin} from '../admin-auth.mjs';
import {readJson,PATHS} from '../storage.mjs';
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET only'});if(!requireAdmin(req,res))return;try{const doc=await readJson(PATHS.changeHistory,{items:[]});return res.status(200).json({ok:true,items:(doc.items||[]).slice(0,100)});}catch(e){return res.status(500).json({ok:false,message:'변경 이력을 읽지 못했습니다.',detail:String(e?.message||e)});}}
