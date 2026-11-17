// Legacy Netlify endpoint, retained during the gradual Cloudflare migration.
import {handleTutorRequest} from '../../server/tutor-core.mjs';
export default function handler(request){
 return handleTutorRequest(request,process.env);
}
