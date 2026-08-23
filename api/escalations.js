import { handler } from '../netlify/functions/escalations.js';
import { adaptNetlifyHandler } from './_netlify-adapter.js';

export default adaptNetlifyHandler(handler);
