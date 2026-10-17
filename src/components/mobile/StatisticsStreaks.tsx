import { BookOpen, BookBookmark, Fire, HandsClapping, ArrowRight } from 'phosphor-react';
import { activityCount, activityStreak, longestActivityStreak } from '../../utils/activityStreak';
import type { ActivityJournal } from '../../utils/activityStreak';
import './statistics-streaks.css';

type Props = { quran: ActivityJournal; hadith: ActivityJournal; prayers: ActivityJournal; now: Date; onOpen: () => void };

export default function StatisticsStreaks({ quran, hadith, prayers, now, onOpen }: Props) {
  const activities = [
    { name: 'Quran', icon: BookOpen, journal: quran, goal: 5, unit: 'ayahs' },
    { name: 'Hadith', icon: BookBookmark, journal: hadith, goal: 2, unit: 'Hadiths' },
    { name: 'Namaz', icon: HandsClapping, journal: prayers, goal: 5, unit: 'prayers' },
  ];
  return <section className="statistics-streaks" aria-labelledby="statistics-streaks-title">
    <div className="statistics-streaks-heading"><div><h2 id="statistics-streaks-title">Your daily streaks</h2><p>Small steps, beautiful habits.</p></div><span><Fire size={27} weight="duotone" aria-hidden="true"/></span></div>
    <div className="statistics-streaks-grid">{activities.map(activity => {
      const streak = activityStreak(activity.journal, activity.goal, now);
      const completed = activityCount(activity.journal, now);
      const best = longestActivityStreak(activity.journal, activity.goal, now);
      return <article key={activity.name} aria-label={`${activity.name} streak`}>
        <span className="statistics-streak-icon"><activity.icon size={23} weight="duotone" aria-hidden="true"/></span>
        <h3>{activity.name}</h3><strong className="statistics-streak-number">{streak}<span>{streak === 1 ? 'day' : 'days'}</span></strong>
        <div className="statistics-streak-progress" role="progressbar" aria-label={`${activity.name} daily progress`} aria-valuemin={0} aria-valuemax={activity.goal} aria-valuenow={Math.min(completed, activity.goal)}><i style={{ width: `${Math.min(completed / activity.goal, 1) * 100}%` }}/></div>
        <p className="statistics-streak-today">{completed}/{activity.goal} {activity.unit} today</p>
        <small>Best: {best} {best === 1 ? 'day' : 'days'}</small>
      </article>;
    })}</div>
    <button className="statistics-streaks-link" onClick={onOpen}>View streaks & daily goals<ArrowRight size={16}/></button>
  </section>;
}
