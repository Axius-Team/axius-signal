import { EventEnvelope } from '../events/envelope';
import { ConfigClient } from '../config';
import { Sink } from '../sinks/types';
import { createBatcher, BatchController } from './batcher';
import { createRetryQueue, RetryQueue } from './queue';
import { createSender, SenderController } from './sender';

export interface TransportManager {
  enqueue(envelope: EventEnvelope): void;
  start(): void;
  stop(): void;
  flush(): Promise<void>;
}

export function createTransport(
  baseUrl: string,
  projectKey: string,
  configClient: ConfigClient,
  sink: Sink
): TransportManager {
  const queue: RetryQueue = createRetryQueue();
  const sender: SenderController = createSender(baseUrl, projectKey, configClient, queue, sink);
  const batcher: BatchController = createBatcher();

  batcher.onBatch = (batch: EventEnvelope[]) => {
    sender.send(batch).then((delivered) => {
      if (!delivered) {
        queue.enqueue(batch);
      }
    }).catch(() => {});
  };

  return {
    enqueue(envelope: EventEnvelope): void {
      batcher.enqueue(envelope);
    },

    start(): void {
      sender.start();
    },

    stop(): void {
      sender.stop();
      batcher.destroy();
    },

    async flush(): Promise<void> {
      const pending = batcher.flush();
      if (pending.length > 0 && batcher.onBatch) {
        batcher.onBatch(pending);
      }
      while (!queue.isEmpty()) {
        const entry = queue.peek();
        if (!entry) {
          break;
        }
        const delivered = await sender.send(entry.batch);
        if (delivered) {
          queue.dequeue();
        } else {
          entry.retryCount++;
          if (entry.retryCount >= 10) {
            queue.dequeue();
          } else {
            break;
          }
        }
      }
    },
  };
}
