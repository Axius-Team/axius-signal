import { EventEnvelope } from '../events/envelope';

export interface Sink {
  write(envelope: EventEnvelope): void;
}
