import { handler } from '../netlify/functions/attendance.js';
import { adaptNetlifyHandler } from './_netlify-adapter.js';

export default adaptNetlifyHandler(handler);
