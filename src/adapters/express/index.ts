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

export function createExpressMiddleware(signal: Signal) {
  return (err: unknown, req: any, res: any, next: (err?: unknown) => void): void => {
    const requestContext: Record<string, unknown> = {
      method: req?.method,
      url: req?.url ? sanitizeUrl(req.url) : undefined,
      headers: req?.headers ? sanitizeHeaders(req.headers) : {},
    };
    signal.captureError(err, { request: requestContext });
    next(err);
  };
}
