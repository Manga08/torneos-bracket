export function isObject(item: unknown): item is Record<string, unknown> {
  return !!(item && typeof item === 'object' && !Array.isArray(item));
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (output as any)[key] = deepMerge((target as any)[key], (source as any)[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}
