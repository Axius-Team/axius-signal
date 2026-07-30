import { EventEnvelope } from '../events/envelope';

export interface BatchController {
  enqueue(envelope: EventEnvelope): void;
  flush(): EventEnvelope[];
  onBatch: ((batch: EventEnvelope[]) => void) | null;
  destroy(): void;
}

export function createBatcher(
  batchSize: number = 10,
  flushIntervalMs: number = 5000
): BatchController {
  let buffer: EventEnvelope[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function startTimer(): void {
    if (timer !== null) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      const batch = buffer;
      buffer = [];
      if (batch.length > 0 && controller.onBatch) {
        controller.onBatch(batch);
      }
    }, flushIntervalMs);
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  const controller: BatchController = {
    onBatch: null,

    enqueue(envelope: EventEnvelope): void {
      buffer.push(envelope);
      if (buffer.length >= batchSize) {
        const batch = buffer;
        buffer = [];
        stopTimer();
        if (controller.onBatch) {
          controller.onBatch(batch);
        }
      } else {
        startTimer();
      }
    },

    flush(): EventEnvelope[] {
      stopTimer();
      const batch = buffer;
      buffer = [];
      return batch;
    },

    destroy(): void {
      stopTimer();
      buffer = [];
      controller.onBatch = null;
    },
  };

  return controller;
}
