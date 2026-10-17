import { useState } from 'react';
import { BookOpen, BookBookmark, Fire, HandsClapping, Target, ArrowRight } from 'phosphor-react';
import { activityCount, activityStreak, longestActivityStreak } from '../../utils/activityStreak';
import type { ActivityJournal } from '../../utils/activityStreak';
import './streak-goals.css';

type Props = { prayers: ActivityJournal; quran: ActivityJournal; hadith: ActivityJournal; onHadith: () => void; now: Date; onQuran: () => void; onPrayers: () => void; onStreaks?: () => void; expanded?: boolean };
export default function StreakGoals({ prayers, quran, hadith, onHadith, now, onQuran, onPrayers, onStreaks, expanded = false }: Props) {
  const [kind, setKind] = useState<'quran' | 'prayer' | 'hadith'>('quran');
  const goals = [
    { id: 'quran' as const, name: 'Quran', goal: 5, unit: 'ayahs', journal: quran, action: onQuran, label: 'Read Quran', icon: BookOpen },
    { id: 'prayer' as const, name: 'Namaz', goal: 5, unit: 'prayers', journal: prayers, action: onPrayers, label: 'Track prayers', icon: HandsClapping },
    { id: 'hadith' as const, name: 'Hadith', goal: 2, unit: 'Hadiths', journal: hadith, action: onHadith, label: 'Read Hadith', icon: BookBookmark },
  ];
  return <div className={`streak-goals ${expanded ? 'streak-goals-expanded' : ''}`}>
    {!expanded && <div className="goal-tabs" aria-label="Daily goals">{goals.map(item => <button key={item.id} aria-pressed={kind === item.id} className={kind === item.id ? 'active' : ''} onClick={() => setKind(item.id)}><item.icon size={15}/>{item.name}</button>)}{onStreaks && <button className="goal-view-streaks" onClick={onStreaks}>Streaks <ArrowRight size={14}/></button>}</div>}
    {goals.filter(item => expanded || item.id === kind).map(item => {
      const count = activityCount(item.journal, now);
      const streak = activityStreak(item.journal, item.goal, now);
      return <section className="daily-goal-card" key={item.id} aria-label={`${item.name} daily goal`}>
        <div className="daily-goal-heading"><span><Target size={22}/></span><div><h2>{expanded ? `${item.name} goal` : "Today's Goal"}</h2><p>{item.id === 'quran' ? 'Read 5 ayahs' : item.id === 'hadith' ? 'Read 2 daily Hadiths' : 'Complete all 5 prayers'}</p></div></div>
        <div className="goal-progress" role="progressbar" aria-label={`${item.name} progress`} aria-valuemin={0} aria-valuemax={item.goal} aria-valuenow={Math.min(count, item.goal)}><i style={{ width: `${Math.min(count / item.goal, 1) * 100}%` }}/></div>
        <div className="goal-totals"><div><small>Completed today</small><strong>{count}/{item.goal} {item.unit}</strong></div><div><small>Current streak</small><strong><Fire size={16} weight="fill"/>{streak} {streak === 1 ? 'day' : 'days'}</strong></div></div>
        <button className="goal-action" onClick={item.action}><item.icon size={18}/>{item.label}</button>
        {expanded && <><p className="goal-best">Best streak: {longestActivityStreak(item.journal, item.goal, now)} days</p><div className="goal-week" aria-label={`${item.name} past seven days`}>{Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now); date.setDate(date.getDate() - 6 + i);
          const completed = activityCount(item.journal, date);
          return <div key={i} className={completed >= item.goal ? 'complete' : ''}><span>{date.toLocaleDateString('en', { weekday: 'short' })}</span><b title={date.toLocaleDateString()}>{Math.min(completed, item.goal)}/{item.goal}</b></div>;
        })}</div></>}
      </section>;
    })}
    {expanded && <p className="streak-explanation">Complete 5 distinct ayahs, both daily Hadiths, or all five prayers in a day to grow the corresponding streak. Tap “Mark read” on each ayah in the Quran reader or on each daily Hadith. A missed day resets the current streak; your best streak stays saved. Activity is saved on this device using your local day.</p>}
  </div>;
}
