import test from 'node:test';
import assert from 'node:assert/strict';
import {handleTutorRequest} from '../server/tutor-core.mjs';
import {onRequestPost,onRequestGet} from '../functions/api/tutor.js';

const url='https://example-codequest.pages.dev/api/tutor';
const getJson=async response=>({status:response.status,data:await response.json()});

test('Cloudflare AI route rejects missing Firebase credentials',async()=>{
 const request=new Request(url,{method:'POST',headers:{Origin:'https://example-codequest.pages.dev','Content-Type':'application/json'},body:JSON.stringify({question:'Python деген не?'})});
 const r=await onRequestPost({request,env:{GEMINI_API_KEY:'demo-secret'}});
 assert.deepEqual(await getJson(r),{status:401,data:{error:'login_required'}});
});
test('Cloudflare route rejects requests from a different browser origin',async()=>{
 const request=new Request(url,{method:'POST',headers:{Origin:'https://not-trusted.example','Content-Type':'application/json'},body:JSON.stringify({question:'Python деген не?'})});
 const response=await handleTutorRequest(request,{GEMINI_API_KEY:'demo-secret'});
 assert.deepEqual(await getJson(response),{status:403,data:{error:'origin_forbidden'}});
});
test('Cloudflare route does not require Netlify-specific host allowlisting',async()=>{
 const previewUrl='https://feature.example-codequest.pages.dev/api/tutor';
 const request=new Request(previewUrl,{method:'POST',headers:{Origin:'https://feature.example-codequest.pages.dev','Content-Type':'application/json'},body:'{}'});
 const response=await handleTutorRequest(request,{GEMINI_API_KEY:'demo-secret'});
 assert.equal(response.status,401);
});
test('Cloudflare GET route does not expose secrets or allow mutations',async()=>{
 const r=await onRequestGet();
 assert.equal(r.status,405);
 const body=await r.json();
 assert.deepEqual(body,{error:'method_not_allowed'});
});
