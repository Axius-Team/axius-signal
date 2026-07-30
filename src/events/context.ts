const MAX_DEPTH = 5;
const MAX_KEYS_PER_LEVEL = 100;

function safeJsonStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

export function sanitizeContext(context: unknown, depth: number = 0): Record<string, unknown> {
  if (context === null || context === undefined) {
    return {};
  }

  if (typeof context !== 'object') {
    return {};
  }

  if (Array.isArray(context)) {
    const serialized = safeJsonStringify(context);
    if (serialized === undefined) {
      return {};
    }
    return JSON.parse(serialized);
  }

  if (depth > MAX_DEPTH) {
    return {};
  }

  const source = context as Record<string, unknown>;
  const keys = Object.keys(source);
  const result: Record<string, unknown> = {};

  for (let i = 0; i < Math.min(keys.length, MAX_KEYS_PER_LEVEL); i++) {
    const key = keys[i];
    const value = source[key];

    if (value !== null && value !== undefined && typeof value === 'object') {
      const serialized = safeJsonStringify(value);
      if (serialized === undefined) {
        result[key] = { serialization_error: true };
      } else {
        const parsed = JSON.parse(serialized);
        if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
          result[key] = sanitizeContext(parsed, depth + 1);
        } else {
          result[key] = parsed;
        }
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
