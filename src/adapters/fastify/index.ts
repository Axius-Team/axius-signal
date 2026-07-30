import { Signal } from '../../core/signal';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-forwarded-for',
  'x-real-ip',
  'x-csrf-token',
  'x-forwarded-proto',
  'x-forwarded-host',
]);

function sanitizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'http://placeholder');
    return parsed.pathname;
  } catch {
    return rawUrl;
  }
}

function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function createFastifyPlugin(signal: Signal) {
  return function fastifySignalPlugin(fastify: any, opts: any, done: (err?: Error) => void): void {
    fastify.addHook('onError', (request: any, reply: any, error: Error, done: (err?: Error) => void) => {
      const requestContext: Record<string, unknown> = {
        method: request?.method,
        url: request?.url ? sanitizeUrl(request.url) : undefined,
        headers: request?.headers ? sanitizeHeaders(request.headers) : {},
      };
      signal.captureError(error, { request: requestContext });
      done();
    });
    done();
  };
}
