import { useEffect, useState } from 'react';
import { registerVisit } from '../utils/visitorCount';

export default function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    let running = false;
    let retry: number | undefined;
    const refresh = () => {
      if (!active || running) return;
      running = true;
      window.clearTimeout(retry);
      registerVisit().then(value => {
        if (active) { setCount(value); setUnavailable(false); }
      }).catch(() => {
        if (active) { setUnavailable(true); retry = window.setTimeout(refresh, 30000); }
      }).finally(() => { running = false; });
    };
    refresh();
    window.addEventListener('online', refresh);
    return () => { active = false; window.clearTimeout(retry); window.removeEventListener('online', refresh); };
  }, []);
  return { count, unavailable };
}
