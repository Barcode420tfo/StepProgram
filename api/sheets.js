import { handler } from '../netlify/functions/sheets.js';
import { adaptNetlifyHandler } from './_netlify-adapter.js';

export default adaptNetlifyHandler(handler);
