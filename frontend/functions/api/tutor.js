// Cloudflare Pages route: POST /api/tutor
// Secrets are read only from Cloudflare's runtime context.env.
import {handleTutorRequest} from '../../server/tutor-core.mjs';
export const onRequestPost=({request,env})=>handleTutorRequest(request,env);
export const onRequestGet=()=>new Response(JSON.stringify({error:'method_not_allowed'}),{
 status:405,
 headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
