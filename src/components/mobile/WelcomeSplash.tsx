import { useEffect, useRef, useState } from 'react';
import { MoonStars, Sparkle } from 'phosphor-react';
import { MosqueScene } from './Artwork';
import './welcome-splash.css';

export default function WelcomeSplash({ night, onFinish }: { night: boolean; onFinish: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    const fade = window.setTimeout(() => setLeaving(true), 2200);
    const finish = window.setTimeout(onFinish, 2600);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(finish);
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, [onFinish]);

  return <dialog ref={dialog} className={`welcome-splash${leaving ? ' is-leaving' : ''}`} aria-labelledby="welcome-title" aria-describedby="welcome-tagline" onCancel={event => { event.preventDefault(); onFinish(); }}>
    <div className="welcome-glow" aria-hidden="true" />
    <div className="welcome-copy">
      <span className="welcome-eyebrow">A moment for your faith</span>
      <img className="welcome-logo" src="/favicon.svg" width="72" height="72" alt="" />
      <h1 id="welcome-title">Awqat <span>Al-Salah</span></h1>
      <p className="welcome-subtitle">Your prayer companion</p>
      <p id="welcome-tagline">Bringing you closer to Allah.</p>
      <div className="welcome-progress" aria-hidden="true"><i /><i /><i /></div>
    </div>
    <div className="welcome-art" aria-hidden="true">
      <MoonStars className="welcome-moon" size={76} weight="duotone" />
      <Sparkle className="welcome-star star-one" size={23} weight="fill" />
      <Sparkle className="welcome-star star-two" size={16} weight="fill" />
      <Sparkle className="welcome-star star-three" size={27} weight="fill" />
      <MosqueScene night={night} />
    </div>
    <button type="button" className="welcome-continue" onClick={onFinish}>Continue to your prayers <span aria-hidden="true">→</span></button>
  </dialog>;
}
