import { useEffect, useState } from 'react';
import { registerVisit } from '../utils/visitorCount';

export default function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    registerVisit().then(value => { if (active) setCount(value); })
      .catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, []);
  return { count, unavailable };
}
