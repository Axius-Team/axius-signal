# API Reference

**Version:** 0.1.0
**Date:** 2026-07-15

## Signal

The central class for error and log capture. It is a singleton -- multiple calls to `Signal.init()` return the same instance.

### `Signal.init(options?)`

Initializes and returns the singleton Signal instance.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.projectKey` | `string` | `''` | Axius Pro project key. If empty, runs in local-only mode (no network calls). |
| `options.environment` | `string` | `'production'` | Environment label attached to every event. |
| `options.baseUrl` | `string` | `'https://ingest.axius.pro'` | Base URL of the ingestion service. Must use HTTPS. |
| `options.configCacheTtlMs` | `number` | `300000` | Cache TTL for server configuration (in milliseconds). |
| `options.sink` | `Sink` | Console sink | Custom local sink for event output. |

**Returns:** `Signal` -- the singleton instance.

If called more than once, subsequent calls merge the provided options into the existing instance via `configure()`. The transport layer, once started, cannot be reconfigured for `projectKey` or `baseUrl` changes.

### `signal.captureError(error, context?)`

Captures an error and writes it to the local sink. If a transport layer is active, also enqueues it for remote delivery.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `error` | `unknown` | The error to capture (Error instance, string, or any value). |
| `context` | `Record<string, unknown>` | Optional structured context attached to the event. |

**Returns:** `CaptureResult` -- an object with `{ eventId: string }`.

### `signal.captureLog(level, message, context?)`

Captures a structured log event and writes it to the local sink. If a transport layer is active, also enqueues it for remote delivery.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `level` | `LogLevel` | One of `'debug'`, `'info'`, `'warn'`, `'error'`. Invalid values default to `'info'`. |
| `message` | `string` | The log message. |
| `context` | `Record<string, unknown>` | Optional structured context attached to the event. |

**Returns:** `CaptureResult` -- an object with `{ eventId: string }`.

### `signal.configure(options)`

Updates configuration on an already-initialized Signal instance. Certain options (`projectKey`, `baseUrl`) cannot be changed once the transport layer has started.

**Parameters:** Same as `init()`, but all fields are optional.

### `signal.disable()`

Disables event capture. Calls to `captureError` and `captureLog` return immediately with an empty `eventId` and produce no output.

### `signal.enable()`

Re-enables event capture after a previous `disable()` call.

### `signal.flush()`

Forces the transport layer to deliver all queued events. Returns a promise that resolves when delivery attempts are complete. Has no effect if no transport layer is active.

## Types

### `SignalOptions`

```typescript
interface SignalOptions {
  projectKey?: string;
  environment?: string;
  baseUrl?: string;
  configCacheTtlMs?: number;
  sink?: Sink;
}
```

### `Sink`

```typescript
interface Sink {
  write(envelope: EventEnvelope): void;
}
```

A sink is any object with a `write` method that accepts an `EventEnvelope`. The default sink writes JSON to the console (using `console.log`, `console.error`, etc. depending on event type). Custom sinks can be provided to route events to files, external services, or other loggers.

### `LogLevel`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

### `EventType`

```typescript
type EventType = 'error' | 'log';
```

### `EventEnvelope`

```typescript
interface EventEnvelope {
  protocol_version: string;
  project_key: string;
  event_id: string;
  event_type: EventType;
  timestamp: string;
  sdk: {
    name: string;
    version: string;
    language: string;
    language_version: string;
  };
  environment: string;
  payload: ErrorPayload | LogPayload;
}
```

### `ErrorPayload`

```typescript
interface ErrorPayload {
  message: string;
  error_type: string;
  stack_trace: StackFrame[];
  grouping_key: string;
  context: Record<string, unknown>;
}
```

### `LogPayload`

```typescript
interface LogPayload {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
}
```

### `StackFrame`

```typescript
interface StackFrame {
  file: string;
  line: number;
  column: number;
  function: string | null;
}
```

### `CaptureResult`

```typescript
interface CaptureResult {
  eventId: string;
}
```

## Utility Exports

### `PROTOCOL_VERSION`

The wire protocol version that this SDK implements. Currently `'0.1.0'`.

### `SDK_INFO`

```typescript
const SDK_INFO = {
  name: 'axius-signal-node',
  version: '0.1.0',
  language: 'node',
  language_version: process.versions.node,
};
```

### `createEventId()`

Generates a UUID v4 event identifier. Returns `string`.

### `computeGroupingKey(errorType, file, line)`

Computes a SHA-256 hash from an error type, file path, and line number. Used for grouping similar errors. Returns `string`.

### `isValidLogLevel(value)`

Type guard that checks whether a string is a valid `LogLevel`. Returns `value is LogLevel`.

### `normalizeError(error, context?)`

Normalizes an unknown error value into a structured `NormalizedError` object with `message`, `errorType`, `stackFrames`, and `groupingKey`.

### `buildErrorPayload(error, context?)`

Builds an `ErrorPayload` from an unknown error value, including stack trace parsing and context sanitization.

### `buildLogPayload(level, message, context?)`

Builds a `LogPayload` from a log level, message, and optional context. Invalid log levels default to `'info'`.

### `NormalizedError`

```typescript
interface NormalizedError {
  message: string;
  errorType: string;
  stackFrames: StackFrame[];
  groupingKey: string;
}
```

### `ConfigResponse`

```typescript
interface ConfigResponse {
  tier: string;
  telemetry_enabled: boolean;
  volume_limit: number | null;
  volume_used: number;
  downgraded: boolean;
  protocol_version: string;
}
```
