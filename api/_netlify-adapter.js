function requestBody(request) {
  if (request.body == null) return '';
  if (Buffer.isBuffer(request.body)) return request.body.toString('utf8');
  if (typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

function queryParameters(request) {
  return Object.fromEntries(
    Object.entries(request.query || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[value.length - 1] : value,
    ])
  );
}

export function adaptNetlifyHandler(handler) {
  return async function vercelHandler(request, response) {
    const event = {
      httpMethod: request.method,
      headers: request.headers || {},
      body: requestBody(request),
      queryStringParameters: queryParameters(request),
    };

    try {
      const result = await handler(event);
      response.statusCode = result?.statusCode || 200;

      for (const [name, value] of Object.entries(result?.headers || {})) {
        if (value != null) response.setHeader(name, value);
      }

      if (result?.isBase64Encoded) {
        response.end(Buffer.from(result.body || '', 'base64'));
        return;
      }

      response.end(result?.body || '');
    } catch (error) {
      console.error('Vercel function adapter failed', error);
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'Internal server error' }));
    }
  };
}
