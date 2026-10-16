const sessionKey = 'salah-visit-session';
const sessionDuration = 30 * 60 * 1000;
let pending: Promise<number> | undefined;
let memorySession: { visitId: string; expiresAt: number } | undefined;

function getVisitId() {
  const now = Date.now();
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    if (typeof saved?.visitId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved.visitId) && saved.expiresAt > now && saved.expiresAt <= now + sessionDuration) {
      memorySession = saved;
    }
  } catch { /* Use the in-memory session when storage is unavailable. */ }
  if (!memorySession || memorySession.expiresAt <= now) {
    memorySession = { visitId: crypto.randomUUID(), expiresAt: now + sessionDuration };
    try { localStorage.setItem(sessionKey, JSON.stringify(memorySession)); } catch { /* Optional storage. */ }
  }
  return memorySession.visitId;
}

export function registerVisit(): Promise<number> {
  // React StrictMode and component remounts share a single request.
  if (!pending) {
    pending = (async () => {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: getVisitId() }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Visitor count is unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid visitor count');
      return data.count as number;
    })().catch(error => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
