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

export function createNestJsFilter(signal: Signal) {
  return {
    catch(exception: unknown, host: any): void {
      let requestContext: Record<string, unknown> = {};
      try {
        if (host && typeof host.switchToHttp === 'function') {
          const ctx = host.switchToHttp();
          const request = ctx.getRequest();
          if (request) {
            requestContext = {
              method: request.method,
              url: request.url ? sanitizeUrl(request.url) : undefined,
              headers: request.headers ? sanitizeHeaders(request.headers) : {},
            };
          }
        }
      } catch {
      }
      signal.captureError(exception, { request: requestContext });
    },
  };
}
