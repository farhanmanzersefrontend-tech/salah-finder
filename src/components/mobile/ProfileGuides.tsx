import { BookOpen, CalendarBlank, CaretRight, Drop } from 'phosphor-react';
import './guides.css';

export type GuideScreen = 'prayer-guide' | 'wudu-guide' | 'islamic-calendar';

const items = [
  { page: 'prayer-guide', title: 'Prayer Guide', description: 'Learn salah, step by step', icon: BookOpen },
  { page: 'wudu-guide', title: 'Wudu Guide', description: 'Prepare for prayer with care', icon: Drop },
  { page: 'islamic-calendar', title: 'Islamic Calendar', description: 'Explore Hijri dates, day by day', icon: CalendarBlank },
] as const;

export default function ProfileGuides({ onOpen }: { onOpen: (page: GuideScreen) => void }) {
  return <section className="profile-guides" aria-labelledby="profile-guides-title">
    <h2 id="profile-guides-title" className="section-label">Guides & calendar</h2>
    <div className="settings-list">
      {items.map(({ page, title, description, icon: Icon }) => <button key={page} onClick={() => onOpen(page)}>
        <span className="setting-icon"><Icon size={22} /></span>
        <span><strong>{title}</strong><small>{description}</small>
        </span>
        <CaretRight size={16} />
      </button>)}
    </div>
  </section>;
}
