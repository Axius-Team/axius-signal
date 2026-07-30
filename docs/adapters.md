# Framework Adapters

**Version:** 0.1.0  
**Date:** 2026-07-15

Framework adapters provide framework-specific integration points for automatically capturing errors with request context. Each adapter is a thin shim: it extracts request information (method, URL, sanitized headers) and passes it as context to `Signal.captureError()`.

All adapters sanitize sensitive request headers before sending. The following headers are always stripped: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-forwarded-for`, `x-real-ip`, `x-csrf-token`, `x-forwarded-proto`, `x-forwarded-host`.

URLs are sanitized to pathname only: query strings and fragments are removed.

## Express

**Import path:** `axius-signal/adapters/express`

### `createExpressMiddleware(signal)`

Returns an Express error-handling middleware `(err, req, res, next)`.

```typescript
import express from 'express';
import { Signal } from 'axius-signal';
import { createExpressMiddleware } from 'axius-signal/adapters/express';

const app = express();
const signal = Signal.init({ projectKey: 'axius_pk_...' });

app.use(createExpressMiddleware(signal));

// The middleware re-throws the error via next(err) after capturing it,
// so other error-handling middleware can still process it.
```

**Context captured:**
- `request.method`: HTTP method (e.g., `'GET'`, `'POST'`)
- `request.url`: Sanitized URL pathname
- `request.headers`: Sanitized headers object (sensitive headers removed)

## Fastify

**Import path:** `axius-signal/adapters/fastify`

### `createFastifyPlugin(signal)`

Returns a Fastify plugin function that hooks into the `onError` lifecycle event.

```typescript
import Fastify from 'fastify';
import { Signal } from 'axius-signal';
import { createFastifyPlugin } from 'axius-signal/adapters/fastify';

const fastify = Fastify();
const signal = Signal.init({ projectKey: 'axius_pk_...' });

fastify.register(createFastifyPlugin(signal));
```

**Context captured:**
- `request.method`: HTTP method
- `request.url`: Sanitized URL pathname
- `request.headers`: Sanitized headers object

## NestJS

**Import path:** `axius-signal/adapters/nestjs`

### `createNestJsFilter(signal)`

Returns an object with a `catch(exception, host)` method compatible with NestJS exception filters.

```typescript
import { NestFactory } from '@nestjs/core';
import { Signal } from 'axius-signal';
import { createNestJsFilter } from 'axius-signal/adapters/nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const signal = Signal.init({ projectKey: 'axius_pk_...' });
  const filter = createNestJsFilter(signal);

  app.useGlobalFilters(filter as any);
  await app.listen(3000);
}
bootstrap();
```

**Context captured:**
- `request.method`: HTTP method
- `request.url`: Sanitized URL pathname
- `request.headers`: Sanitized headers object

The filter safely handles cases where the host does not have an HTTP context (e.g., websockets or microservice transports): the request context will be an empty object in those cases.

## Writing Custom Adapters

To add support for a framework not listed above, create a file in `src/adapters/<framework>/index.ts` that:

1. Imports `Signal` from `../../core/signal` (or accepts a `Signal` instance as a parameter).
2. Exports a factory function that returns the framework-appropriate middleware/hook/plugin.
3. The factory function should extract relevant request context and pass it to `signal.captureError()`.
4. Sanitize sensitive headers using the same pattern as existing adapters.

The core is framework-agnostic: adapters only depend on core, never the reverse.
