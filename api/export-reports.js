import { handler } from '../netlify/functions/export-reports.js';
import { adaptNetlifyHandler } from './_netlify-adapter.js';

export default adaptNetlifyHandler(handler);
