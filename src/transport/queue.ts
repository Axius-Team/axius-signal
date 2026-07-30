import { EventEnvelope } from '../events/envelope';

export interface QueueEntry {
  id: string;
  batch: EventEnvelope[];
  retryCount: number;
  enqueuedAt: number;
}

export interface RetryQueue {
  enqueue(batch: EventEnvelope[]): void;
  dequeue(): QueueEntry | undefined;
  peek(): QueueEntry | undefined;
  size(): number;
  remove(id: string): void;
  isEmpty(): boolean;
  clear(): void;
}

const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 10;

export function createRetryQueue(maxSize: number = MAX_QUEUE_SIZE, maxRetries: number = MAX_RETRY_COUNT): RetryQueue {
  const entries: QueueEntry[] = [];

  function generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  return {
    enqueue(batch: EventEnvelope[]): void {
      const entry: QueueEntry = {
        id: generateId(),
        batch,
        retryCount: 0,
        enqueuedAt: Date.now(),
      };
      if (entries.length >= maxSize) {
        entries.shift();
      }
      entries.push(entry);
    },

    dequeue(): QueueEntry | undefined {
      return entries.shift();
    },

    peek(): QueueEntry | undefined {
      return entries.length > 0 ? entries[0] : undefined;
    },

    size(): number {
      return entries.length;
    },

    remove(id: string): void {
      const index = entries.findIndex((e) => e.id === id);
      if (index >= 0) {
        entries.splice(index, 1);
      }
    },

    isEmpty(): boolean {
      return entries.length === 0;
    },

    clear(): void {
      entries.length = 0;
    },
  };
}

export { MAX_QUEUE_SIZE, MAX_RETRY_COUNT };
