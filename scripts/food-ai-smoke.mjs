// Explicitly invoked smoke test. Reads the key only into this process; never prints it.
import {readFile} from 'node:fs/promises';
import {analyzeFood,FoodAiError} from '../server/food-ai.ts';
import {imageMime} from '../lib/exercise-evidence.ts';
process.loadEnvFile('.env.local');
const imagePath=process.argv[2];
if(!imagePath || !process.env.OPENAI_API_KEY)throw new Error('Image path or server key missing');
const bytes=new Uint8Array(await readFile(imagePath));
const mime=imageMime(bytes);
if(!mime)throw new Error('Unsupported image');
const diagnosticFetch=async (...args)=>{
  const response=await fetch(...args);
  if(!response.ok){
    const body=await response.clone().json().catch(()=>({}));
    const safeToken=value=>typeof value==='string'&&/^[a-zA-Z0-9_.\[\]-]{1,100}$/.test(value)&&!value.startsWith('sk-')?value:null;
    const message=typeof body.error?.message==='string'?body.error.message:'';
    console.log(JSON.stringify({httpStatus:response.status,code:safeToken(body.error?.code),type:safeToken(body.error?.type),param:safeToken(body.error?.param),mentionsUnsupportedSchema:/schema|additionalProperties|maxLength|maxItems/i.test(message),mentionsQuota:/quota|credits|balance|billing/i.test(message),mentionsModel:/model/i.test(message)}));
  }
  return response;
};
try {const result=await analyzeFood(bytes,mime,process.env.OPENAI_API_KEY,diagnosticFetch);console.log(JSON.stringify({status:'success',result}));}
catch(e){console.log(JSON.stringify({status:'failed',code:e instanceof FoodAiError?e.code:'unexpected',message:e instanceof FoodAiError?e.message:'測試失敗，未顯示原始錯誤。'}));process.exitCode=1;}
