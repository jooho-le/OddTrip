const demoSourcePattern = /(?:^|[-_\s])(demo|mock|fallback|static)(?:$|[-_\s])/i;

export function sourceLabel(source?: string | null) {
  const value = source?.trim();
  if (!value) return '출처 미제공';
  return demoSourcePattern.test(value) ? `DEMO · ${value}` : `출처 · ${value}`;
}
