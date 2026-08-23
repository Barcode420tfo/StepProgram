import { handler } from '../netlify/functions/store-capture.js';
import { adaptNetlifyHandler } from './_netlify-adapter.js';

export default adaptNetlifyHandler(handler);
