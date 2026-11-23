import { EventEnvelope } from '../events/envelope';

export function redactEnvelopeForSink(envelope: EventEnvelope): EventEnvelope {
  return {
    ...envelope,
    project_key: '',
  };
}
