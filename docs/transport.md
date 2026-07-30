# Transport Layer

**Version:** 0.1.0  
**Date:** 2026-07-15

The transport layer is responsible for delivering captured events to the remote ingestion service. It is only initialized when a `projectKey` is configured at startup. When no project key is set, events are written only to the local sink and the transport layer remains inactive.

## Architecture

```
Event captured
      |
      v
  Batcher (transport/batcher.ts)
    - Collects events into a buffer
    - Flushes when buffer reaches 10 events OR 5 seconds elapsed
      |
      v
  Sender.send() (transport/sender.ts)
    - HTTPS POST to {baseUrl}/events
    - Authorization: Bearer {projectKey}
      |
      +-- Success (2xx) --> Done
      |
      +-- Failure ------> RetryQueue (transport/queue.ts)
              |
              v
         Exponential backoff (transport/backoff.ts)
              |
              v
         Retry (up to 10 attempts)
              |
              +-- Success --> Done
              |
              +-- Failed after 10 attempts --> Drop batch, log warning
```

## Batching (batcher.ts)

Events are batched before being sent to reduce HTTP overhead:

| Parameter | Value |
|---|---|
| Batch size | 10 events |
| Flush interval | 5 seconds |
| Format | JSON array of event envelopes |

The batcher collects events into an in-memory buffer. When either the buffer reaches 10 events or 5 seconds have elapsed since the first event entered the buffer, the batch is flushed to the sender. This ensures a maximum delivery latency of 5 seconds for any event.

## Retry Queue (queue.ts)

The retry queue stores batches that failed to deliver. Key characteristics:

| Property | Value |
|---|---|
| Maximum entries | 100 batches |
| Eviction policy | FIFO (oldest dropped first) |
| Maximum retries per batch | 10 |
| Storage | In-memory only (not persisted to disk) |

When the queue is full and a new batch needs to be enqueued, the oldest entry is evicted to make room.

## Backoff (backoff.ts)

Failed deliveries are retried using exponential backoff with full jitter:

```
base_delay_ms = 1000        // 1 second
max_delay_ms  = 60000       // 1 minute
clamped_n     = min(n, 6)   // Cap at 6 for delay calculation
delay_ms      = min(base_delay_ms * 2^clamped_n, max_delay_ms)
actual_delay  = random(0, delay_ms)   // Full jitter
```

| Attempt | Delay Window | Cumulative (worst case) |
|---|---|---|
| 0 | 0 - 1,000 ms | 0 - 1 s |
| 1 | 0 - 2,000 ms | 1 - 3 s |
| 2 | 0 - 4,000 ms | 3 - 7 s |
| 3 | 0 - 8,000 ms | 7 - 15 s |
| 4 | 0 - 16,000 ms | 15 - 31 s |
| 5 | 0 - 32,000 ms | 31 - 63 s |
| 6-10 | 0 - 60,000 ms | ~63 s - ~6 min |

Full jitter (uniform random between 0 and the calculated delay) prevents thundering herd when multiple SDK instances retry simultaneously after an outage.

## Sender (sender.ts)

The sender performs HTTPS POST requests to the ingestion service:

- **Endpoint:** `{baseUrl}/events`
- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {projectKey}`
  - `Content-Length: <bytes>`
- **Timeout:** 30 seconds
- **TLS:** `rejectUnauthorized: true` (valid certificates required)

### HTTP Status Handling

| Status Code | Behavior |
|---|---|
| 200-299 | Delivery considered successful |
| 401 (Unauthorized) | Project key rejected. All queued events are dropped. A warning is logged via the local sink. |
| 403 (Forbidden) | Config is re-fetched (may indicate plan downgrade or suspension). Batch is retried. |
| 429 (Too Many Requests) | Config is re-fetched (may indicate volume limit reached). Batch is retried with backoff. |
| Other 4xx/5xx | Batch is retried with backoff. |

### Retry Loop

A background loop processes the retry queue continuously while the transport is active. It polls the queue every 1 second when idle. On each cycle, it picks the oldest batch from the queue, attempts delivery, and either removes it on success or increments the retry count on failure. Batches that exceed 10 retry attempts are dropped and a warning is logged.

## Config Interaction

On 403 or 429 responses, the sender immediately re-fetches the server configuration (see `config/index.ts`). This allows the SDK to discover plan changes (e.g., downgraded tier or revoked key) without waiting for the 5-minute cache TTL to expire.

## Flush

The `signal.flush()` method forces all pending batches through the delivery pipeline: it drains the batcher and then processes every entry in the retry queue sequentially. If a batch still fails during flush, it is re-enqueued or dropped per the normal retry policy.

## Event Lifespan

Under normal operation, events are delivered within 0-5 seconds (the batching window). Under network outages, events remain in the queue for up to approximately 6 minutes before being dropped. The local sink always receives the event immediately at capture time, regardless of transport success or failure.
