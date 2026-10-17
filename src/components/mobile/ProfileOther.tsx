import { useRef, useState } from "react";
import { CaretRight, Check, Copy, EnvelopeSimple, Heart, InstagramLogo, ShareNetwork, Star } from "phosphor-react";
import { SettingsSheet } from "./SettingsControls";
import "./profile-other.css";

const otherItems = [
  { id: "feedback", title: "Feedback", description: "Share your thoughts with us", icon: EnvelopeSimple },
  { id: "rate", title: "Rate Us", description: "Your experience with the app", icon: Star },
  { id: "share", title: "Share App", description: "Help friends stay connected to their prayers", icon: ShareNetwork },
  { id: "support", title: "Financial Support", description: "Support the app and be part of Sadaqah Jariyah", icon: Heart },
] as const;
type Panel = "feedback" | "rate" | "share" | "support" | "instagram";

export default function ProfileOther() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [feedback, setFeedback] = useState(() => { try { return localStorage.getItem("salah-feedback-draft") || ""; } catch { return ""; } });
  const [rating, setRating] = useState(() => { try { const value = Number(localStorage.getItem("salah-app-rating")); return value >= 1 && value <= 5 ? value : 0; } catch { return 0; } });
  const [formStatus, setFormStatus] = useState("");
  const feedbackEmail = import.meta.env.VITE_FEEDBACK_EMAIL?.trim();
  const reviewUrl = import.meta.env.VITE_APP_REVIEW_URL?.trim();
  const safeReviewUrl = reviewUrl && /^https:\/\//i.test(reviewUrl) ? reviewUrl : undefined;
  const shareInput = useRef<HTMLInputElement>(null);
  // Use the public app address from the site's metadata, including in local previews.
  const appUrl = typeof document !== "undefined"
    ? document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content || window.location.origin
    : "https://awqat-alsalah.vercel.app/";
  const title = panel === "instagram" ? "Instagram" : otherItems.find(item => item.id === panel)?.title || "";

  async function shareApp() {
    setCopied(false);
    setCopyError(false);
    if (navigator.share) {
      setSharing(true);
      try {
        await navigator.share({ title: "Awqat Al-Salah", text: "A little closer, every day. Find prayer times with Awqat Al-Salah.", url: appUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally { setSharing(false); }
    }
    setPanel("share");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      shareInput.current?.focus();
      shareInput.current?.select();
    }
  }

  return <section className="profile-other" aria-labelledby="profile-other-title">
    <h2 id="profile-other-title" className="section-label">Other</h2>
    <div className="profile-other-list">
      {otherItems.map(({ id, title: itemTitle, description, icon: Icon }) => <button
        key={id}
        type="button"
        className="settings-menu-card profile-other-card"
        aria-haspopup="dialog"
        disabled={id === "share" && sharing}
        onClick={() => { setFormStatus(""); if (id === "share") void shareApp(); else setPanel(id); }}
      >
        <span className="settings-card-icon"><Icon size={23} weight="regular" aria-hidden="true" /></span>
        <span className="settings-card-copy">
          <strong>{itemTitle}</strong>
          <small>{description}</small>
          {id === "support" && <span className="profile-soon-label">Coming soon</span>}
        </span>
        <CaretRight className="settings-chevron" size={18} aria-hidden="true" />
      </button>)}
    </div>
    <button type="button" className="settings-menu-card profile-instagram-card" aria-haspopup="dialog" onClick={() => setPanel("instagram")}>
      <InstagramLogo size={28} weight="regular" aria-hidden="true" />
      <strong>Show us some love</strong>
      <span>Connect with us on Instagram<br />and find a little inspiration every day.</span>
      <span className="profile-soon-label">Coming soon</span>
    </button>
    {panel && <SettingsSheet title={title} busy={false} onClose={() => setPanel(null)}>
      {panel === "feedback" ? <form className="profile-feedback-form" onSubmit={event => {
        event.preventDefault();
        try { localStorage.setItem("salah-feedback-draft", feedback.trim()); setFormStatus("Draft saved on this device. It has not been sent."); }
        catch { setFormStatus("Could not save your draft. Copy your message before closing."); }
      }}>
        <p className="settings-hint">Tell us what you like or what we can improve.</p>
        <label className="settings-field" htmlFor="profile-feedback">Your feedback</label>
        <textarea id="profile-feedback" value={feedback} onChange={event => { setFeedback(event.target.value); setFormStatus(""); }} required maxLength={4000} rows={6} placeholder="Share your thoughts…" />
        <button className="primary-button" type="submit" disabled={!feedback.trim()}>Save draft</button>
        {feedbackEmail && feedback.trim() && <a className="outline-button" href={`mailto:${encodeURIComponent(feedbackEmail)}?subject=${encodeURIComponent("Awqat Al-Salah feedback")}&body=${encodeURIComponent(feedback.trim())}`}>Open email to send</a>}
        <p className="profile-share-status" role="status">{formStatus || (feedbackEmail ? "Send your message using your email app." : "Feedback is saved locally until a contact address is connected.")}</p>
      </form> : panel === "rate" ? <div className="profile-rating-panel">
        <p className="settings-hint">How has your experience been?</p>
        <div className="profile-rating-stars" role="group" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} ${value === 1 ? "star" : "stars"}`} aria-pressed={rating === value} onClick={() => {
            setRating(value);
            try { localStorage.setItem("salah-app-rating", String(value)); setFormStatus("Your rating is saved on this device."); }
            catch { setFormStatus("Could not save your rating on this device."); }
          }}><Star size={34} weight={value <= rating ? "fill" : "regular"} /></button>)}
        </div>
        <p className="profile-share-status" role="status">{formStatus || (rating ? `Your saved rating: ${rating} out of 5` : "Choose a star to save your rating on this device.")}</p>
        {safeReviewUrl && <a className="primary-button" href={safeReviewUrl} target="_blank" rel="noopener noreferrer">Write a store review</a>}
      </div> : panel === "share" ? <div className="profile-share-panel">
        <span className="settings-card-icon"><ShareNetwork size={26} aria-hidden="true" /></span>
        <p className="settings-hint">Share a little reminder. Send the app to your friends and family.</p>
        <label className="settings-field">App link<input ref={shareInput} readOnly value={appUrl} onFocus={event => event.target.select()} /></label>
        <button type="button" className="primary-button" onClick={() => { void copyLink(); }}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Link copied" : "Copy link"}</button>
        <p className="profile-share-status" role="status">{copyError ? "Select and copy the link above to share it." : copied ? "Ready to share with someone you care about." : ""}</p>
      </div> : <div className="profile-coming-soon">
        <span className="settings-card-icon">{panel === "instagram" ? <InstagramLogo size={28} /> : panel === "support" ? <Heart size={28} /> : panel === "rate" ? <Star size={28} /> : <EnvelopeSimple size={28} />}</span>
        <h3>Coming soon</h3>
        <p>{panel === "instagram" ? "Our Instagram page" : title} will be available here soon.</p>
        <button type="button" className="outline-button" onClick={() => setPanel(null)}>Got it</button>
      </div>}
    </SettingsSheet>}
  </section>;
}
