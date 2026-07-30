# Architecture

**Version:** 0.1.0  
**Date:** 2026-07-15

## Module Overview

```
src/
  index.ts              # Public exports
  core/
    signal.ts           # Singleton Signal class (public API entry point)
    capture.ts          # Capture layer (event creation, sink + transport dispatch)
  events/
    envelope.ts         # Event envelope types, protocol version, ID generation
    error.ts            # Error normalization and payload building
    log.ts              # Log payload building
    context.ts          # Context sanitization (depth limit, circular refs)
  sinks/
    types.ts            # Sink interface
    console.ts          # Default console sink implementation
  transport/
    index.ts            # Transport manager (orchestrates batcher, queue, sender)
    batcher.ts          # Event batching (size/time thresholds)
    queue.ts            # Retry queue (bounded, in-memory, FIFO)
    sender.ts           # HTTP sender (HTTPS POST, retry loop, backoff)
    backoff.ts          # Exponential backoff with jitter calculation
  config/
    index.ts            # Config client (fetches server configuration, cached)
  adapters/
    express/index.ts    # Express error middleware
    fastify/index.ts    # Fastify plugin
    nestjs/index.ts     # NestJS exception filter
```

## Data Flow

```
Application code
       |
       v
  Signal.captureError() / Signal.captureLog()
       |
       v
  createCapture() (core/capture.ts)
       |
       +---> Sink.write() (local sink: always active)
       |
       +---> Transport.enqueue() (only if transport is active, i.e. projectKey is set)
                  |
                  v
             Batcher (transport/batcher.ts)
               - Buffers events
               - Flushes at 10 events or after 5 seconds
                  |
                  v
             Sender.send() (transport/sender.ts)
               - HTTPS POST to ingestion service
               - On failure: RetryQueue (up to 10 retries)
               - Exponential backoff with full jitter
               - On 401: drop all queued events (key revoked)
               - On 403/429: re-fetch config before next retry
```

## Core Design Principles

### Dual Mode, Single Code Path

The SDK has exactly one code path for capturing errors and logs. Whether captured data is only written to the local sink or also transmitted to the ingestion service depends entirely on whether a `projectKey` is configured at initialization. This design ensures zero-friction upgrade from local-only to connected mode without code changes.

### Framework-Agnostic Core

The core (`src/core/`) has zero imports from any framework package. Framework-specific adapters live in `src/adapters/` and import from core, never the reverse. Each adapter exports a single factory function and is distributed as a separate npm entry point.

### Protocol-First Design

The SDK communicates with the ingestion service using a versioned wire protocol. The protocol version is compiled into the SDK and checked against the server's version at startup. The SDK and protocol versions are decoupled: the protocol follows its own semver, and each SDK release implements exactly one protocol version.

## Component Details

### Capture Layer (core/capture.ts)

The capture layer builds event envelopes and dispatches them to:
1. The **local sink** (always active): immediately writes the event to the configured sink.
2. The **transport layer** (only if active): enqueues the event for batched remote delivery.

It handles two event types:
- `error`: built via `buildErrorPayload()` which normalizes the error, parses the stack trace (V8 format), computes a grouping key, and sanitizes context.
- `log`: built via `buildLogPayload()` which validates the log level and sanitizes context.

### Context Sanitization (events/context.ts)

All context objects passed to capture methods are sanitized:
- Maximum nesting depth: 5 levels
- Maximum keys per level: 100
- Non-serializable values are replaced with `{ serialization_error: true }`

### Local Sink (sinks/console.ts)

The default sink writes events as JSON strings to the console:
- Error events always use `console.error`
- Log events use `console.error` for error level, `console.warn` for warn, `console.debug` for debug, `console.log` for info

Custom sinks can be provided via the `sink` option in `SignalOptions`.

### Transport Layer

The transport layer handles batched, retry-capable delivery of events to the ingestion service. See the [Transport Layer documentation](transport.md) for details.

### Config Client (config/index.ts)

The config client fetches server-side configuration (plan tier, telemetry settings, volume limits) from the ingestion service:
- Authenticated via Bearer token (project key)
- Cached for 5 minutes by default (configurable)
- Falls back to cached or default values on fetch failure
- Used to determine whether telemetry is enabled and what protocol version the server expects

## Protocol Version Compatibility

The SDK checks its compiled `PROTOCOL_VERSION` against the server's returned `protocol_version` at startup:

| Condition | Behavior |
|---|---|
| Same major version | Normal operation |
| Server one major ahead | Degraded: sends using its own compiled version |
| Server one major behind | Degraded: sends, logs deprecation warning |
| Difference > 1 major | Blocked: refuses to send, logs error |
| Config endpoint unreachable | Degraded: queues events, retries config fetch |

The compatibility rules above are designed to prevent silent data corruption while allowing safe gradual rollout of new protocol versions across the SDK ecosystem.
