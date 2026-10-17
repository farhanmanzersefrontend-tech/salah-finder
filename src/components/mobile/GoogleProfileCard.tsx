import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Moon, SignOut } from "phosphor-react";
import {
  getGoogleAuth,
  handleGoogleSignIn,
  googleAuthConfigured,
  googleAuthError,
} from "../../utils/googleAuth";
import "./google-profile.css";

export default function GoogleProfileCard({ streak }: { streak: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(googleAuthConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    if (googleAuthConfigured) {
      setInitializing(true);
      getGoogleAuth()
        .then(({ auth, sdk }) => {
          if (cancelled) return;
          unsubscribe = sdk.onAuthStateChanged(
            auth,
            (value) => {
              if (cancelled) return;
              setUser(value);
              setPhotoFailed(false);
              setInitializing(false);
            },
            (error) => {
              if (!cancelled) {
                setError(googleAuthError(error));
                setInitializing(false);
              }
            },
          );
        })
        .catch((error) => {
          if (!cancelled) {
            setError(googleAuthError(error));
            setInitializing(false);
          }
        });
    }
    return () => {
      cancelled = true;
      active.current = false;
      unsubscribe?.();
    };
  }, [attempt]);

  async function signIn() {
    if (busy || initializing) return;
    setError("");
    if (!googleAuthConfigured) {
      setError("Google sign-in is not available yet. Please try again later.");
      return;
    }
    setBusy(true);
    try {
      await handleGoogleSignIn();
    } catch (error) {
      if (active.current) setError(googleAuthError(error));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function signOut() {
    setError("");
    setBusy(true);
    try {
      const { auth, sdk } = await getGoogleAuth();
      await sdk.signOut(auth);
    } catch {
      if (active.current) setError("Unable to sign out. Please try again.");
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <section
      className="profile-card google-profile-card"
      aria-busy={busy || initializing}
    >
      <div className="profile-avatar">
        {user?.photoURL && !photoFailed ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <Moon size={32} weight="duotone" />
        )}
      </div>
      <h2>
        Assalamu alaikum
        {user?.displayName ? (
          <span className="google-profile-name">{user.displayName}</span>
        ) : null}
      </h2>
      <p>{user?.email || "A little closer, every day."}</p>
      <span className="small-pill">{streak} day prayer streak</span>
      {user ? (
        <button
          className="google-sign-out"
          type="button"
          disabled={busy}
          onClick={() => void signOut()}
        >
          <SignOut size={17} />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      ) : (
        <>
          <button
            className="google-sign-in"
            type="button"
            disabled={busy || initializing}
            onClick={() => void signIn()}
          >
            <GoogleLogo />
            <span>
              {initializing
                ? "Getting ready…"
                : busy
                  ? "Signing in…"
                  : "Continue with Google"}
            </span>
          </button>
          <p className="google-profile-caption">
            One button to sign up or sign in.
          </p>
        </>
      )}
      {error && (
        <div className="google-profile-error" role="alert">
          <p>{error}</p>
          {googleAuthConfigured && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.2H24v8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2a12.3 12.3 0 0 1-18.3-6.4H5.6v5.4A20.4 20.4 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.5 27.5a12.3 12.3 0 0 1 0-7.1V15H5.6a20 20 0 0 0 0 18l6.9-5.5Z"
      />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.6 15l6.9 5.4A12 12 0 0 1 24 12Z"
      />
    </svg>
  );
}
