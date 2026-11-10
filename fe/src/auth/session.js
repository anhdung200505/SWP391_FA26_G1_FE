const STORAGE_KEY = 'anhduy.session';

function parseSession(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed?.token || !parsed?.user?.id) return null;
  return parsed;
}

export function readSession() {
  try {
    const saved = parseSession(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
    const currentTab = parseSession(sessionStorage.getItem(STORAGE_KEY));
    if (!currentTab) return null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTab));
    return currentTab;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  const raw = JSON.stringify(session);
  localStorage.setItem(STORAGE_KEY, raw);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}