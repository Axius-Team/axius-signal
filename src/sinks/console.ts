import { Sink } from './types';
import { EventEnvelope } from '../events/envelope';

export function createConsoleSink(): Sink {
  return {
    write(envelope: EventEnvelope): void {
      const output = JSON.stringify({
        event_id: envelope.event_id,
        event_type: envelope.event_type,
        timestamp: envelope.timestamp,
        environment: envelope.environment,
        payload: envelope.payload,
      });
      if (envelope.event_type === 'error') {
        console.error(output);
      } else {
        const logPayload = envelope.payload as { level: string; message: string };
        const level = logPayload.level || 'info';
        const message = logPayload.message || '';
        const consoleFn = level === 'error' ? console.error
          : level === 'warn' ? console.warn
          : level === 'debug' ? console.debug
          : console.log;
        consoleFn(output);
      }
    },
  };
}
