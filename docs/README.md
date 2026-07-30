# Axius Signal

**Version:** 0.1.0  
**Date:** 2026-07-15  
**License:** Apache-2.0

Open source error and log handling library for Node.js applications. Axius Signal provides a unified API for capturing errors and structured logs in Node.js applications, with optional remote telemetry transmission to the axius.pro ingestion service.

## Overview

Axius Signal operates in two modes:

- **Free / standalone mode**: the SDK acts as a local-only error and log handler. No network calls are made. No account required.
- **Pro / connected mode**: captured data is additionally transmitted to the axius.pro ingestion service for dashboard viewing and AI-driven diagnostic reports. Requires a project key.

Both modes use the same code path. A single installed package works in either mode based solely on runtime configuration.

## Installation

```bash
npm install axius-signal
```

## Quick Start

### Local-only mode (no account needed)

```typescript
import { Signal } from 'axius-signal';

const signal = Signal.init();

signal.captureLog('info', 'Application started');
signal.captureError(new Error('Something went wrong'));
```

### Connected mode (with project key)

```typescript
import { Signal } from 'axius-signal';

const signal = Signal.init({
  projectKey: 'axius_pk_your_project_key',
  environment: 'production',
});

signal.captureError(new Error('Something went wrong'));
```

### With Express

```typescript
import { Signal } from 'axius-signal';
import { createExpressMiddleware } from 'axius-signal/adapters/express';

const signal = Signal.init({ projectKey: 'axius_pk_...' });
app.use(createExpressMiddleware(signal));
```

### With Fastify

```typescript
import { Signal } from 'axius-signal';
import { createFastifyPlugin } from 'axius-signal/adapters/fastify';

const signal = Signal.init({ projectKey: 'axius_pk_...' });
fastify.register(createFastifyPlugin(signal));
```

### With NestJS

```typescript
import { Signal } from 'axius-signal';
import { createNestJsFilter } from 'axius-signal/adapters/nestjs';

const signal = Signal.init({ projectKey: 'axius_pk_...' });
const filter = createNestJsFilter(signal);
// Use as a NestJS exception filter
```

## Package Entry Points

| Import Path | Description |
|---|---|
| `axius-signal` | Core SDK (Signal class, types, utilities) |
| `axius-signal/adapters/express` | Express error middleware |
| `axius-signal/adapters/fastify` | Fastify plugin |
| `axius-signal/adapters/nestjs` | NestJS exception filter |

## Requirements

- Node.js >= 18.0.0
- TypeScript (for type definitions)

## Related Documentation

- [API Reference](api.md): Full API documentation
- [Architecture](architecture.md): System architecture and module overview
- [Framework Adapters](adapters.md): Express, Fastify, NestJS adapter guides
- [Transport Layer](transport.md): Batching, queue, retry, and backoff details
- [Authentication](authentication.md): Project key authentication and security model
