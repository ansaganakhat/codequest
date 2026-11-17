import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorProviderFromEnv,requestTutorAnswer,TutorProviderError,DEFAULT_GEMINI_MODEL} from '../netlify/lib/tutor-provider.mjs';

test('prefer cloud Gemini even if desktop FreeLLM is configured',()=>{
 const p=tutorProviderFromEnv({
  GEMINI_API_KEY:'private-server-only',
  FREELLM_BASE_URL:'http://127.0.0.1:31415/v1',
  FREELLM_API_KEY:'other',FREELLM_MODEL:'auto'
 });
 assert.equal(p.type,'gemini');
 assert.equal(p.model,DEFAULT_GEMINI_MODEL);
 assert.equal(p.key,'private-server-only');
});
test('without Gemini, keep separately hosted HTTPS FreeLLM as an option',()=>{
 const p=tutorProviderFromEnv({FREELLM_BASE_URL:'https://ai.example.kz/v1',FREELLM_API_KEY:'private',FREELLM_MODEL:'auto'});
 assert.equal(p.type,'freellm');
 assert.equal(p.endpoint,'https://ai.example.kz/v1/chat/completions');
 assert.throws(()=>tutorProviderFromEnv({FREELLM_BASE_URL:'http://127.0.0.1:31415/v1',FREELLM_API_KEY:'private',FREELLM_MODEL:'auto'}),{message:'freellm_https_required'});
});
test('fails closed if no cloud API credentials are configured',()=>{
 assert.throws(()=>tutorProviderFromEnv({}),{message:'ai_not_configured'});
});
test('Gemini request uses server key, guarded URL, school system instruction and returns only answer',async()=>{
 const p=tutorProviderFromEnv({GEMINI_API_KEY:'private-key',GEMINI_MODEL:'gemini-3.5-flash-lite'});
 let called=false;
 const fetcher=async(url,options)=>{
  called=true;
  assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent'));
  assert.equal(options.headers['x-goog-api-key'],'private-key');
  assert.equal(options.headers.Authorization,undefined);
  const body=JSON.parse(options.body);
  assert.equal(body.systemInstruction.parts[0].text,'Only school questions');
  assert.equal(body.contents[0].parts[0].text,'Python for loop');
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Python uses for loops.'}]}}]}),{status:200});
 };
 const result=await requestTutorAnswer(p,'Python for loop','Only school questions',fetcher);
 assert.deepEqual(result,{answer:'Python uses for loops.',provider:'gemini'});
 assert.equal(called,true);
});
test('API quota errors return safe public error codes',async()=>{
 const p=tutorProviderFromEnv({GEMINI_API_KEY:'private'});
 await assert.rejects(requestTutorAnswer(p,'Python','school',async()=>new Response('{"secret":"anything"}',{status:429})),err=>err instanceof TutorProviderError&&err.message==='ai_quota_exceeded'&&err.status===429);
});
test('network errors do not leak API key or upstream details',async()=>{
 const p=tutorProviderFromEnv({GEMINI_API_KEY:'private'});
 await assert.rejects(requestTutorAnswer(p,'Python','school',async()=>{throw Error('private-token could not connect')}),err=>err.message==='ai_provider_unreachable'&&!String(err).includes('private-token'));
});
test('FreeLLM HTTPS request remains compatible with OpenAI chat completions',async()=>{
 const p=tutorProviderFromEnv({FREELLM_BASE_URL:'https://ai.example.kz/v1',FREELLM_API_KEY:'key',FREELLM_MODEL:'auto'});
 const res=await requestTutorAnswer(p,'Math 2+2','school',async(url,options)=>{
  assert.equal(url,'https://ai.example.kz/v1/chat/completions');
  assert.equal(options.headers.Authorization,'Bearer key');
  assert.equal(JSON.parse(options.body).model,'auto');
  return new Response(JSON.stringify({choices:[{message:{content:'4'}}]}),{status:200});
 });
 assert.equal(res.answer,'4');assert.equal(res.provider,'freellm');
});
