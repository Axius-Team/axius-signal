import * as https from 'https';
import { EventEnvelope } from '../events/envelope';
import { ConfigClient } from '../config';
import { calculateBackoff } from './backoff';
import { RetryQueue, QueueEntry } from './queue';
import { Sink } from '../sinks/types';

export interface SenderController {
  send(batch: EventEnvelope[]): Promise<boolean>;
  start(): void;
  stop(): void;
}

function postBatch(
  baseUrl: string,
  projectKey: string,
  batch: EventEnvelope[]
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(baseUrl);

    if (urlObj.protocol !== 'https:') {
      reject(new Error('HTTPS is required for event ingestion'));
      return;
    }

    const normalisedPath = urlObj.pathname.replace(/\/+$/, '');
    const eventsPath = `${normalisedPath}/events`;

    const body = JSON.stringify(batch);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
      path: eventsPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${projectKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
      rejectUnauthorized: true,
    };
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString('utf-8');
        resolve({ status: res.statusCode || 500, body: responseBody });
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(body);
    req.end();
  });
}

export function createSender(
  baseUrl: string,
  projectKey: string,
  configClient: ConfigClient,
  queue: RetryQueue,
  sink: Sink
): SenderController {
  let running = false;
  let processing = false;
  let stopRequested = false;

  async function processQueue(): Promise<void> {
    if (processing || !running) {
      return;
    }
    processing = true;
    while (!stopRequested) {
      const entry = queue.peek();
      if (!entry) {
        break;
      }
      const delivered = await attemptDelivery(entry);
      if (delivered) {
        queue.dequeue();
      } else {
        entry.retryCount++;
        if (entry.retryCount >= 10) {
          queue.dequeue();
          sink.write({
            protocol_version: '0.1.0',
            project_key: '',
            event_id: 'internal',
            event_type: 'log',
            timestamp: new Date().toISOString(),
            sdk: { name: 'axius-signal-node', version: '0.1.0', language: 'node', language_version: process.version },
            environment: 'internal',
            payload: { level: 'warn', message: 'Event batch dropped after 10 failed delivery attempts', context: { batch_id: entry.id } },
          });
          continue;
        }
        const delay = calculateBackoff(entry.retryCount);
        await sleep(delay);
        if (stopRequested) {
          break;
        }
      }
    }
    processing = false;
  }

  async function attemptDelivery(entry: QueueEntry): Promise<boolean> {
    try {
      const response = await postBatch(baseUrl, projectKey, entry.batch);
      if (response.status >= 200 && response.status < 300) {
        return true;
      }
      if (response.status === 401) {
        sink.write({
          protocol_version: '0.1.0',
          project_key: '',
          event_id: 'internal',
          event_type: 'log',
          timestamp: new Date().toISOString(),
          sdk: { name: 'axius-signal-node', version: '0.1.0', language: 'node', language_version: process.version },
          environment: 'internal',
          payload: { level: 'warn', message: 'Project key rejected (401) - dropping all queued events', context: {} },
        });
        queue.clear();
        return true;
      }
      if (response.status === 403 || response.status === 429) {
        await configClient.refreshConfig();
        return false;
      }
      return false;
    } catch {
      return false;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return {
    async send(batch: EventEnvelope[]): Promise<boolean> {
      try {
        const response = await postBatch(baseUrl, projectKey, batch);
        return response.status >= 200 && response.status < 300;
      } catch {
        return false;
      }
    },

    start(): void {
      running = true;
      stopRequested = false;
      loop();
    },

    stop(): void {
      stopRequested = true;
      running = false;
    },
  };

  async function loop(): Promise<void> {
    while (running && !stopRequested) {
      try {
        await processQueue();
      } catch {
      }
      if (!stopRequested) {
        await sleep(1000);
      }
    }
  }
}
