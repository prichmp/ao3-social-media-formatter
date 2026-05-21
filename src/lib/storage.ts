const KEY = 'ao3-formatter-state';

let timer: ReturnType<typeof setTimeout> | null = null;

export function saveState(state: unknown): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage failure degrades gracefully
    }
  }, 500);
}

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
