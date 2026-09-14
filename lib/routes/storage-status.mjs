import { list } from '@vercel/blob';
import { requireAdmin } from '../admin-auth.mjs';
import { SCHOOL_ID, PATHS } from '../storage.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'GET 요청만 허용됩니다.'});
 if(!requireAdmin(req,res))return;
 try{const prefix=`schools/${SCHOOL_ID}/`,{blobs}=await list({prefix,limit:100});const byPath=Object.fromEntries(blobs.map(b=>[b.pathname,{size:b.size,uploadedAt:b.uploadedAt,etag:b.etag}]));const catalog=byPath[PATHS.catalog]||null,config=byPath[`${prefix}config/school-config.json`]||null,state=byPath[PATHS.state]||null;return res.status(200).json({ok:true,storageConnected:true,initialized:Boolean(catalog&&state),catalog,config,state,blobCount:blobs.length,schoolId:SCHOOL_ID,authMode:process.env.VERCEL_OIDC_TOKEN?'oidc':(process.env.BLOB_READ_WRITE_TOKEN?'token':'sdk-auto')});}catch(error){return res.status(500).json({ok:false,storageConnected:false,code:'BLOB_STATUS_FAILED',message:'Vercel Blob 상태를 확인하지 못했습니다.',detail:String(error?.stack||error?.message||error),env:{blobStoreId:Boolean(process.env.BLOB_STORE_ID),oidcToken:Boolean(process.env.VERCEL_OIDC_TOKEN),rwToken:Boolean(process.env.BLOB_READ_WRITE_TOKEN)}});}
}
