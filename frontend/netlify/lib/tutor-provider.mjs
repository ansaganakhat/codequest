/**
 * CodeQuest Tutor providers. Server-only module; NEVER import from React UI.
 *
 * GEMINI_API_KEY is preferred. It runs entirely on Google/Netlify,
 * even when the developer's Windows desktop is sleeping or powered off.
 * FREELLM_* remains available for a separately hosted HTTPS FreeLLMAPI.
 */
export const DEFAULT_GEMINI_MODEL='gemini-3.5-flash-lite';

export class TutorProviderError extends Error{
 constructor(code,status=502){super(code);this.name='TutorProviderError';this.status=status}
}

export function tutorProviderFromEnv(env){
 const geminiKey=String(env.GEMINI_API_KEY||'').trim();
 if(geminiKey){
  const model=String(env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL).trim();
  if(!/^[a-z0-9][a-z0-9._-]{1,90}$/.test(model))
   throw new TutorProviderError('ai_model_invalid',503);
  return {type:'gemini',key:geminiKey,model};
 }
 const endpoint=String(env.FREELLM_BASE_URL||'').trim();
 const key=String(env.FREELLM_API_KEY||'').trim();
 const model=String(env.FREELLM_MODEL||'').trim();
 if(!endpoint||!key||!model)throw new TutorProviderError('ai_not_configured',503);
 let url;
 try{
  url=new URL(endpoint);
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error();
  url.pathname=url.pathname.replace(/\/$/,'');
  if(!url.pathname.endsWith('/v1'))url.pathname+='/v1';
  url.pathname+='/chat/completions';
  url.search='';url.hash='';
 }catch{throw new TutorProviderError('freellm_https_required',503)}
 return {type:'freellm',key,model,endpoint:url.toString()};
}

function upstreamFailure(status){
 if(status===400)throw new TutorProviderError('ai_request_rejected',502);
 if(status===401||status===403)throw new TutorProviderError('ai_api_key_invalid',502);
 if(status===404)throw new TutorProviderError('ai_model_not_found',502);
 if(status===429)throw new TutorProviderError('ai_quota_exceeded',429);
 if(status===503||status===502||status===504)throw new TutorProviderError('ai_provider_busy',503);
 throw new TutorProviderError('ai_provider_error',502);
}
function geminiAnswer(body){
 return body?.candidates?.[0]?.content?.parts
  ?.filter(p=>typeof p?.text==='string')
  .map(p=>p.text).join('\n').trim()||'';
}

export async function requestTutorAnswer(provider,question,system,fetcher=fetch){
 let url,headers,body;
 if(provider.type==='gemini'){
  // Fixed Google endpoint prevents user-controlled SSRF.
  url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(provider.model)+':generateContent';
  headers={'Content-Type':'application/json','x-goog-api-key':provider.key};
  body={
   systemInstruction:{parts:[{text:system}]},
   contents:[{role:'user',parts:[{text:question}]}],
   generationConfig:{temperature:0.3,maxOutputTokens:1024}
  };
 }else if(provider.type==='freellm'){
  url=provider.endpoint;
  headers={'Content-Type':'application/json',Authorization:'Bearer '+provider.key};
  body={model:provider.model,messages:[{role:'system',content:system},{role:'user',content:question}],temperature:0.3,max_tokens:700,stream:false};
 }else throw new TutorProviderError('ai_not_configured',503);
 let response;
 try{
  response=await fetcher(url,{
   method:'POST',headers,
   body:JSON.stringify(body),
   signal:AbortSignal.timeout(23000)
  });
 }catch{throw new TutorProviderError('ai_provider_unreachable',503)}
 if(!response.ok)upstreamFailure(response.status);
 let payload;
 try{payload=await response.json()}catch{throw new TutorProviderError('ai_invalid_response',502)}
 const answer=(provider.type==='gemini'?geminiAnswer(payload):payload?.choices?.[0]?.message?.content);
 if(typeof answer!=='string'||!answer.trim())throw new TutorProviderError('ai_empty_response',502);
 return {answer:answer.trim().slice(0,4000),provider:provider.type};
}
