import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, CaretRight, X } from "phosphor-react";

export function SettingRow({ title, description, onClick, disabled = false }: { title: string; description: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="settings-detail-row" onClick={onClick} disabled={disabled}>
    <span><strong>{title}</strong><small>{description}</small></span><CaretRight size={17} aria-hidden="true" />
  </button>;
}
export function SettingToggle({ title, description, checked, onChange, disabled = false }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="settings-toggle-row">
    <span><strong>{title}</strong><small>{description}</small></span>
    <input type="checkbox" role="switch" aria-label={title} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
  </label>;
}
export function MinuteField({ title, value, onChange, min = -60, max = 60, disabled = false }: { title: string; value: number; onChange: (value: number) => void; min?: number; max?: number; disabled?: boolean }) {
  return <label className="settings-minute-field"><span>{title}<small>{min < 0 ? "Negative = before · Positive = after" : "Minutes"}</small></span>
    <input type="number" min={min} max={max} step={1} required value={Number.isFinite(value) ? value : ""} onChange={e => onChange(e.target.valueAsNumber)} disabled={disabled} />
  </label>;
}

export function SettingsSheet({ title, children, onClose, onBack, busy }: { title: string; children: ReactNode; onClose: () => void; onBack?: () => void; busy: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); trigger?.focus(); };
  }, []);
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>(".settings-sheet-heading")?.focus();
    dialog.current?.scrollTo({ top: 0 });
  }, [title]);
  return <dialog ref={dialog} className="settings-sheet" aria-labelledby={titleId} onCancel={event => {
    event.preventDefault(); if (!busy) onClose();
  }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="settings-sheet-heading" tabIndex={-1}>
      {onBack && <button type="button" className="icon-button" aria-label="Back to previous settings" onClick={onBack} disabled={busy}><ArrowLeft size={19} /></button>}
      <h2 id={titleId}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close settings dialog" onClick={onClose} disabled={busy}><X size={19} /></button>
    </div>
    <div className="settings-sheet-content">{children}</div>
  </dialog>;
}
