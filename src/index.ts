export { Signal } from './core/signal';
export type { SignalOptions } from './core/signal';
export type { Sink } from './sinks/types';
export type { EventEnvelope, ErrorPayload, LogPayload, LogLevel, StackFrame, EventType } from './events/envelope';
export type { ConfigResponse } from './config';
export { PROTOCOL_VERSION, SDK_INFO, createEventId, computeGroupingKey, isValidLogLevel } from './events/envelope';
export { normalizeError, buildErrorPayload } from './events/error';
export { buildLogPayload } from './events/log';
export type { NormalizedError } from './events/error';
