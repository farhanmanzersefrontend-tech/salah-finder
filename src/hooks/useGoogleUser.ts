import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getGoogleAuth } from '../utils/googleAuth';

export default function useGoogleUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    getGoogleAuth().then(({ auth, sdk }) => {
      if (!active) return;
      unsubscribe = sdk.onAuthStateChanged(auth, value => {
        if (active) setUser(value);
      }, () => {
        if (active) setUser(null);
      });
    }).catch(() => {
      if (active) setUser(null);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return user;
}
