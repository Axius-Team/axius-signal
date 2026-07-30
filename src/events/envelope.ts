import * as crypto from 'crypto';

export const PROTOCOL_VERSION = '0.1.0';

export const SDK_INFO = {
  name: 'axius-signal-node',
  version: '0.1.0',
  language: 'node',
  language_version: process.versions.node,
};

export type EventType = 'error' | 'log';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StackFrame {
  file: string;
  line: number;
  column: number;
  function: string | null;
}

export interface ErrorPayload {
  message: string;
  error_type: string;
  stack_trace: StackFrame[];
  grouping_key: string;
  context: Record<string, unknown>;
}

export interface LogPayload {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
}

export interface EventEnvelope {
  protocol_version: string;
  project_key: string;
  event_id: string;
  event_type: EventType;
  timestamp: string;
  sdk: {
    name: string;
    version: string;
    language: string;
    language_version: string;
  };
  environment: string;
  payload: ErrorPayload | LogPayload;
}

export function createEventId(): string {
  return crypto.randomUUID();
}

export function computeGroupingKey(errorType: string, file: string, line: number): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${errorType}:${file}:${line}`);
  return hash.digest('hex');
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export function isValidLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as string[]).includes(value);
}
