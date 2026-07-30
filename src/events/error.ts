import { ErrorPayload, StackFrame, computeGroupingKey } from './envelope';
import { sanitizeContext } from './context';

export interface NormalizedError {
  message: string;
  errorType: string;
  stackFrames: StackFrame[];
  groupingKey: string;
}

function parseStackLine(line: string): StackFrame | null {
  const v8Pattern = /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+?))\)?\s*$/;
  const match = line.match(v8Pattern);
  if (!match) {
    return null;
  }
  const func = match[1] || null;
  const file = match[2] || match[5] || '<anonymous>';
  const lineNum = parseInt(match[3], 10) || 0;
  const col = parseInt(match[4], 10) || 0;
  return { file, line: lineNum, column: col, function: func };
}

function extractStackFrames(stack: string | undefined): StackFrame[] {
  if (!stack) {
    return [];
  }
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];
  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }
  return frames;
}

export function normalizeError(error: unknown, context?: Record<string, unknown>): NormalizedError {
  if (error instanceof Error) {
    const type = error.name || 'Error';
    const message = error.message || String(error);
    const stackFrames = extractStackFrames(error.stack);
    const topFrame = stackFrames.length > 0 ? stackFrames[0] : null;
    const groupingKey = topFrame
      ? computeGroupingKey(type, topFrame.file, topFrame.line)
      : computeGroupingKey(type, '<no-stack>', 0);
    return { message, errorType: type, stackFrames, groupingKey };
  }
  if (typeof error === 'string') {
    const message = error;
    return {
      message,
      errorType: 'Error',
      stackFrames: [],
      groupingKey: computeGroupingKey('Error', message, 0),
    };
  }
  const message = String(error);
  return {
    message,
    errorType: 'UnknownError',
    stackFrames: [],
    groupingKey: computeGroupingKey('UnknownError', message, 0),
  };
}

export function buildErrorPayload(
  error: unknown,
  context?: Record<string, unknown>
): ErrorPayload {
  const normalized = normalizeError(error, context);
  return {
    message: normalized.message,
    error_type: normalized.errorType,
    stack_trace: normalized.stackFrames,
    grouping_key: normalized.groupingKey,
    context: sanitizeContext(context),
  };
}
