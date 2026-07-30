import { LogPayload, LogLevel, isValidLogLevel } from './envelope';
import { sanitizeContext } from './context';

export function buildLogPayload(
  level: string,
  message: string,
  context?: Record<string, unknown>
): LogPayload {
  const normalizedLevel: LogLevel = isValidLogLevel(level) ? level : 'info';
  return {
    level: normalizedLevel,
    message,
    context: sanitizeContext(context),
  };
}
