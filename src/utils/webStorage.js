export function loadWebState(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWebState(key, next) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}
