<table border="0">
  <tr>
    <td>
      <img width="80" height="80" alt="axius-ico" src="https://i.imgur.com/LkZ3BJk.png" />
    </td>
    <td>
      <h1>Axius Signal</h1>
    </td>
  </tr>
</table>

Open source error and log handling library for Node.js applications.

Capture errors and structured logs with a unified API. Run in local-only mode with no account, or connect to the axius.pro ingestion service for dashboard insights and AI-driven diagnostics.

## Features

- **Dual mode**: works as a standalone logger (no account, no network calls) or as a connected telemetry SDK with a project key. Same code path, same package, runtime configuration only.
- **Framework adapters**: drop-in error handling middleware for Express, Fastify, and NestJS. Request context (method, URL, sanitized headers) is captured automatically.
- **Smart batching and retry**: events are batched (10 events or 5 seconds) and delivered via HTTPS with exponential backoff, full jitter, and up to 10 retries. Local output is never blocked by network issues.
- **Structured events**: errors include parsed stack traces (V8 format), grouping keys (SHA-256), and sanitized context. Logs support debug/info/warn/error levels.
- **Protocol-aware**: compiled-in protocol version with server negotiation. Graceful degradation when versions differ; hard block only when major versions differ by more than one.
- **Custom sinks**: replace the default console output with any custom sink implementing the `Sink` interface.

## Installation

```bash
npm install axius-signal
```

Node.js >= 18.0.0 required.

## Quick Start

### Local-only mode (no account needed)

```typescript
import { Signal } from 'axius-signal';

const signal = Signal.init();

signal.captureLog('info', 'Application started', { pid: process.pid });
signal.captureError(new Error('Something went wrong'));
```

### Connected mode (with Axius Pro account)

```typescript
import { Signal } from 'axius-signal';

const signal = Signal.init({
  projectKey: 'axius_pk_your_project_key',
  environment: 'production',
});

signal.captureError(new Error('Something went wrong'), { userId: 'usr_123' });
```

### With Express

```typescript
import express from 'express';
import { Signal } from 'axius-signal';
import { createExpressMiddleware } from 'axius-signal/adapters/express';

const app = express();
const signal = Signal.init({ projectKey: 'axius_pk_...' });
app.use(createExpressMiddleware(signal));
```

### With Fastify

```typescript
import Fastify from 'fastify';
import { Signal } from 'axius-signal';
import { createFastifyPlugin } from 'axius-signal/adapters/fastify';

const fastify = Fastify();
const signal = Signal.init({ projectKey: 'axius_pk_...' });
fastify.register(createFastifyPlugin(signal));
```

### With NestJS

```typescript
import { Signal } from 'axius-signal';
import { createNestJsFilter } from 'axius-signal/adapters/nestjs';

const signal = Signal.init({ projectKey: 'axius_pk_...' });
const filter = createNestJsFilter(signal);
app.useGlobalFilters(filter as any);
```

## Package Entry Points

| Import Path | Description |
|---|---|
| `axius-signal` | Core SDK: Signal class, types, utilities |
| `axius-signal/adapters/express` | Express error middleware |
| `axius-signal/adapters/fastify` | Fastify plugin |
| `axius-signal/adapters/nestjs` | NestJS exception filter |

## Documentation

| Document | Description |
|---|---|
| [API Reference](docs/api.md) | Full API reference for the Signal class and all exported types |
| [Architecture](docs/architecture.md) | Module overview, data flow, design principles |
| [Framework Adapters](docs/adapters.md) | Express, Fastify, NestJS adapter usage guides |
| [Transport Layer](docs/transport.md) | Batching, queue, retry, backoff, and sender internals |
| [Authentication](docs/authentication.md) | Project key authentication and security model |

## License

Copyright 2026 Axius Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
