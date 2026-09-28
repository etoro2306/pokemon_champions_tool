export function toID(text: unknown): string {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Hash FNV-1a de 32 bits en hexadecimal: suficiente para detectar cambios en listas. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function pct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
