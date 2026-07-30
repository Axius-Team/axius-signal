import {
  EventEnvelope,
  EventType,
  LogLevel,
  SDK_INFO,
  PROTOCOL_VERSION,
  createEventId,
} from '../events/envelope';
import { buildErrorPayload } from '../events/error';
import { buildLogPayload } from '../events/log';
import { Sink } from '../sinks/types';
import { TransportManager } from '../transport';

export interface CaptureOptions {
  projectKey: string;
  environment: string;
  sink: Sink;
  transport: TransportManager | null;
}

export interface CaptureResult {
  eventId: string;
}

export function createCapture(options: CaptureOptions) {
  const { projectKey, environment, sink, transport } = options;

  function buildEnvelope(eventType: EventType, payload: unknown): EventEnvelope {
    return {
      protocol_version: PROTOCOL_VERSION,
      project_key: projectKey,
      event_id: createEventId(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      sdk: { ...SDK_INFO },
      environment,
      payload: payload as EventEnvelope['payload'],
    };
  }

  function captureError(error: unknown, context?: Record<string, unknown>): CaptureResult {
    const payload = buildErrorPayload(error, context);
    const envelope = buildEnvelope('error', payload);
    sink.write(envelope);
    if (transport) {
      transport.enqueue(envelope);
    }
    return { eventId: envelope.event_id };
  }

  function captureLog(level: LogLevel, message: string, context?: Record<string, unknown>): CaptureResult {
    const payload = buildLogPayload(level, message, context);
    const envelope = buildEnvelope('log', payload);
    sink.write(envelope);
    if (transport) {
      transport.enqueue(envelope);
    }
    return { eventId: envelope.event_id };
  }

  return { captureError, captureLog };
}
