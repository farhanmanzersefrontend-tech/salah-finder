import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

export default function DraggableMapSheet({ className, title, children }: { className: string; title: string; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const gesture = useRef<{ y: number; height: number; moved: boolean } | null>(null);
  const expandedHeight = useRef(400);
  const [collapsed, setCollapsed] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const ignoreClick = useRef(false);
  const peek = 82;
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !panel.current) return;
    const height = panel.current.getBoundingClientRect().height;
    if (!collapsed) expandedHeight.current = height;
    gesture.current = { y: event.clientY, height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || !panel.current) return;
    const delta = current.y - event.clientY;
    if (Math.abs(delta) < 5 && !current.moved) return;
    current.moved = true;
    const maximum = (panel.current.parentElement?.clientHeight || window.innerHeight) * 0.72;
    setDragHeight(Math.max(peek, Math.min(maximum, current.height + delta)));
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) {
      ignoreClick.current = true;
      window.setTimeout(() => { ignoreClick.current = false; }, 0);
      if (!cancelled) {
        const height = panel.current?.getBoundingClientRect().height || peek;
        setCollapsed(height < (peek + expandedHeight.current) / 2);
      }
    }
    setDragHeight(null);
  }
  return <section ref={panel} className={`${className} map-bottom-sheet ${collapsed ? 'sheet-collapsed' : ''} ${dragHeight !== null ? 'sheet-dragging' : ''}`}
    style={{ height: dragHeight ?? (collapsed ? peek : undefined) }} aria-label={title}>
    <button className="sheet-drag-handle" aria-label={collapsed ? 'Expand details to show the list' : 'Collapse details to show the map'} aria-expanded={!collapsed}
      onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
      onClick={() => { if (!ignoreClick.current) setCollapsed(value => !value); }}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setCollapsed(true); } if (event.key === 'ArrowUp') { event.preventDefault(); setCollapsed(false); } }}>
      <span className="finder-handle" /><span className="sheet-handle-caption">{collapsed ? title : 'Slide down to see the map'}</span>
    </button>
    <div className="sheet-scroll-content" inert={collapsed && dragHeight === null}>{children}</div>
  </section>;
}
