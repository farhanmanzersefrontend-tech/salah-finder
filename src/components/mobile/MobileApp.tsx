import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alarm,
  Bell,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartBar,
  Check,
  Compass,
  Fire,
  HandsClapping,
  House,
  MapPin,
  Moon,
  Palette,
  CaretDown,
  CaretLeft,
  CaretRight,
  GearSix,
  SlidersHorizontal,
  UserCircle,
  X,
  NavigationArrow,
  SpeakerHigh,
  SpeakerSlash,
  Sparkle,
  Sun,
  Users,
} from "phosphor-react";
import { CALCULATION_METHODS, usePrayerStore } from "../../store/usePrayerStore";
import type { CalculationSettings, PrayerTimings } from "../../store/usePrayerStore";
import { bannerPhase } from "../../utils/bannerTime";
import { PRAYER_ORDER } from "../../utils/prayerNames";
import { getNextPrayer } from "../../utils/azanScheduler";
import { adjustPrayerTimes, prayerWallDate, timeMinutes, validateCalculation } from "../../utils/prayerPreferences";
import { currentPrayerLocation } from "../../utils/prayerLocation";
import { stopAzan } from "../../utils/playAzan";
import { formatHijri } from "../../utils/islamicCalendar";
import AzanPanel from "../AzanPanel";
import AzanVoices from "./AzanVoices";
import QiblaPage from "../QiblaPage";
import AsmaPage from "../AsmaPage";
import { Landscape, MosqueScene } from "./Artwork";
import { dayKey, getStreak, useSaved } from "./useJournal";
import type { Journal } from "./useJournal";
import MobileQuran from "./MobileQuran";
import StreakGoals from "./StreakGoals";
import StatisticsStreaks from "./StatisticsStreaks";
import { dailyHadithNumbers, hadithDay } from "../../utils/dailyHadith";
import MobileDuas from "./MobileDuas";
import MobileSettings from "./MobileSettings";
import ProfileOther from "./ProfileOther";
import GoogleProfileCard from "./GoogleProfileCard";
import ProfileGuides from "./ProfileGuides";
import type { GuideScreen } from "./ProfileGuides";
import IslamicCalendar from "./IslamicCalendar";
import PrayerGuide from "./PrayerGuide";
import WelcomeSplash from "./WelcomeSplash";
import CitySearch, { cityLabel } from "./CitySearch";
import type { CitySuggestion } from "./CitySearch";
import "./mobile.css";
import "./desktop.css";
import "./night.css";
import useVisitorCount from "../../hooks/useVisitorCount";
import { useNavigationState } from "../../hooks/useNavigationState";

type Screen =
  | GuideScreen
  | "home"
  | "streaks"
  | "stats"
  | "dua"
  | "quran"
  | "profile"
  | "settings"
  | "manual-times"
  | "notification-settings"
  | "themes"
  | "masjid"
  | "qibla"
  | "asma"
  | "alarm";
const themeNames = ["Garden of peace", "Lilac evening", "Golden hour"];
const gregorianDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function ClockFace({ now }: { now: Date }) {
  return (
    <div className="clock-face" aria-hidden="true">
      <span className="clock-twelve">12</span>
      <span className="clock-six">6</span>
      <i
        style={{
          transform: `rotate(${now.getHours() * 30 + now.getMinutes() / 2}deg)`,
        }}
      />
      <i
        className="minute-hand"
        style={{ transform: `rotate(${now.getMinutes() * 6}deg)` }}
      />
      <b />
    </div>
  );
}

export default function MobileApp({ playingPrayer, onMuteAzan }: { playingPrayer: string | null; onMuteAzan: () => void }) {
  const [screen, setScreen, backScreen] = useNavigationState<Screen>("screen", "home", true);
  const [now, setNow] = useState(new Date());
  const [hadithJournal, setHadithJournal] = useSaved<Record<string, string[]>>("salah-hadith-daily-journal", {});
  const [, navigateHadithTab] = useNavigationState("duaTab", "Daily");
  const [quranJournal, setQuranJournal] = useSaved<Record<string, string[]>>("salah-quran-daily-journal", {});
  const [journal, setJournal] = useSaved<Journal>("salah-mobile-journal", {});
  const [theme, setTheme] = useSaved("salah-mobile-theme", 0);
  const [night, setNight] = useSaved("salah-night-mode", false);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return sessionStorage.getItem('salah-welcome-seen') !== '1'; }
    catch { return true; }
  });
  const finishWelcome = useCallback(() => {
    try { sessionStorage.setItem('salah-welcome-seen', '1'); } catch { /* Continue if storage is unavailable. */ }
    setShowWelcome(false);
  }, []);
  const [hijriOffset, setHijriOffset] = useSaved("salah-hijri-offset", 0);
  const visitors = useVisitorCount();
  const [showLocation, navigateLocation, backLocation] = useNavigationState("locationDialog", false);
  const setShowLocation = (open: boolean) => open ? navigateLocation(true) : backLocation(false);
  const [busy, setBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationPhase, setLocationPhase] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [period, setPeriod] = useState("week");
  const store = usePrayerStore();
  const locationDialog = useRef<HTMLDialogElement>(null);
  const locationRequest = useRef<AbortController | null>(null);
  const locationTrigger = useRef<HTMLElement | null>(null);
  const timesRequest = useRef<AbortController | null>(null);
  const today = dayKey(now);
  const prayerNow = prayerWallDate(now, store.timezone);
  const prayerToday = dayKey(prayerNow);
  const hijriDate = formatHijri(now, hijriOffset);
  const done = journal[today] || [];
  const streak = getStreak(journal, now);
  const hasTimes = PRAYER_ORDER.every((p) =>
    /^\d{2}:\d{2}/.test(store.timings[p]),
  );
  const next = hasTimes ? getNextPrayer(store.timings, prayerNow) : null;
  const minutes = next
    ? Math.max(0, Math.ceil((next.at.getTime() - prayerNow.getTime()) / 60000))
    : 0;
  const go = (target: Screen) => {
    setScreen(target);
    window.scrollTo({ top: 0 });
  };
  const goBack = (fallback: Screen = "home") => backScreen(fallback);
  const openHadith = () => {
    go("dua");
    navigateHadithTab("Hadith", true);
  };
  const openPrayerTracker = () => {
    go("home");
    window.requestAnimationFrame(() => document.querySelector('.prayer-sheet')?.scrollIntoView({ block: 'start' }));
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (showLocation) {
      locationTrigger.current = document.activeElement as HTMLElement;
      locationDialog.current?.showModal();
    } else {
      locationRequest.current?.abort();
      locationDialog.current?.close();
      locationTrigger.current?.focus();
    }
  }, [showLocation]);

  async function loadTimes(lat: number, lon: number, label: string, calculation = usePrayerStore.getState().calculation, requestSignal?: AbortSignal) {
    validateCalculation(calculation);
    timesRequest.current?.abort();
    const controller = new AbortController();
    timesRequest.current = controller;
    const response = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${calculation.method}&school=${calculation.school}&latitudeAdjustmentMethod=${calculation.highLatitude}`,
      { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000), ...(requestSignal ? [requestSignal] : [])]) },
    );
    if (!response.ok)
      throw new Error("Prayer times are unavailable. Please try again.");
    const data = await response.json();
    const raw = Object.fromEntries(
      PRAYER_ORDER.map((p) => [p, data.data?.timings?.[p]?.slice(0, 5)]),
    ) as PrayerTimings;
    if (!PRAYER_ORDER.every((p) => Number.isFinite(timeMinutes(raw[p] || ""))))
      throw new Error("Unable to load prayer times. Please try again.");
    if (controller.signal.aborted) throw new Error("A newer location request is in progress.");
    requestSignal?.throwIfAborted();
    const timezone = data.data?.meta?.timezone || "";
    const date = prayerWallDate(new Date(), timezone);
    const timings = adjustPrayerTimes(raw, calculation, Number(data.data?.date?.hijri?.month?.number) === 9, date.getDay() === 5);
    usePrayerStore.setState({ timings, coords: { lat, lon }, location: label, calculation, timezone });
    setLocationAccuracy(null);
    localStorage.setItem("salah-times-date", dayKey(date));
  }

  async function saveCalculation(calculation: CalculationSettings) {
    validateCalculation(calculation);
    if (store.coords.lat !== null && store.coords.lon !== null) {
      await loadTimes(store.coords.lat, store.coords.lon, store.location, calculation);
    } else store.setCalculation(calculation);
  }

  function resetSettings() {
    timesRequest.current?.abort();
    stopAzan();
    onMuteAzan();
    store.resetSettings();
    setTheme(0);
    setNight(false);
    setHijriOffset(0);
    setLocationError("");
    localStorage.removeItem("salah-times-date");
  }
  // Refresh the selected location each day so saved timings never silently become yesterday's schedule.
  useEffect(() => {
    if (
      store.coords.lat === null ||
      store.coords.lon === null ||
      localStorage.getItem("salah-times-date") === prayerToday
    )
      return;
    let active = true;
    loadTimes(store.coords.lat, store.coords.lon, store.location).catch(() => {
      if (active)
        setLocationError(
          "Could not refresh today’s times. Select your location to retry.",
        );
    });
    return () => {
      active = false;
    };
    // Coordinates and the local date are the refresh triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.coords.lat, store.coords.lon, prayerToday]);

  async function selectCity(city: CitySuggestion) {
    setBusy(true);
    setLocationError("");
    try {
      await loadTimes(city.latitude, city.longitude, cityLabel(city));
      setShowLocation(false);
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Unable to load location.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function detectLocation() {
    locationRequest.current?.abort();
    const controller = new AbortController();
    locationRequest.current = controller;
    setBusy(true);
    setLocationError("");
    try {
      setLocationPhase('Finding your precise location…');
      const { lat, lon, label, accuracy } = await currentPrayerLocation({ ...store.locationPreferences, method: 'gps' }, controller.signal);
      setLocationPhase('Loading prayer times…');
      await loadTimes(lat, lon, label, undefined, controller.signal);
      if (controller.signal.aborted) return;
      setLocationAccuracy(accuracy);
      setShowLocation(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      setLocationError(error instanceof Error ? error.message : "Could not load prayer times. Please try again.");
    } finally { if (locationRequest.current === controller) { setBusy(false); setLocationPhase(''); } }
  }
  const header = (title: string, back: Screen = "home") => (
    <header className="mobile-header">
      <button
        className="icon-button back-button"
        onClick={() => goBack(back)}
        aria-label="Go back"
      >
        <ArrowLeft size={19} />
      </button>
      <h1>{title}</h1>
      <span className="header-spacer" />
    </header>
  );
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const totalDays = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - (period === "week" ? 6 : 29));
  const periodTotal = Object.entries(journal)
    .filter(([date]) => date >= dayKey(periodStart) && date <= today)
    .reduce((sum, [, prayers]) => sum + prayers.length, 0);
  const nav = [
    { key: "home", label: "Home", icon: House },
    { key: "stats", label: "Activity", icon: ChartBar },
    { key: "dua", label: "Dua", icon: HandsClapping },
    { key: "quran", label: "Quran", icon: BookOpen },
    { key: "profile", label: "Profile", icon: UserCircle },
  ] as const;

  return (
    <div
      className={`mobile-app theme-${theme} ${night ? "night-mode" : "day-mode"} screen-${screen}`}
    >
      {showWelcome && !playingPrayer && <WelcomeSplash night={night || theme === 1} onFinish={finishWelcome} />}
      {playingPrayer && <aside className="azan-playing-popup" aria-label="Azan playback controls">
        <div className="azan-playing-heading" role="status">
          <SpeakerHigh size={24} aria-hidden="true" />
          <div><strong>{playingPrayer} · Azan is playing</strong><p>Your call to prayer</p></div>
        </div>
        <button className="primary-button" type="button" onClick={onMuteAzan}><SpeakerSlash size={18} /> Mute this azan</button>
        <button className="outline-button" type="button" onClick={() => { store.setAzanSettings({ autoAzanEnabled: false }); onMuteAzan(); }}>Turn off automatic azan</button>
      </aside>}
      <main className="mobile-main">
        {screen === "home" && (
          <>
            <section className="home-hero">
              <MosqueScene phase={bannerPhase(prayerNow, store.timings)} azan={Boolean(playingPrayer)} />
              <div className="home-topline">
                <span className="wordmark">
                  <img src="/favicon.svg" alt="" width="30" height="30" />
                  Awqat Al-Salah
                </span>
                <div className="home-header-actions">
                  <button
                    className="icon-button header-action"
                    type="button"
                    onClick={() => go("settings")}
                    aria-label="Settings"
                    title="Settings"
                  >
                    <GearSix size={23} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button header-action"
                    type="button"
                    onClick={() => go("profile")}
                    aria-label="Open profile menu"
                    title="Your profile"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M10 5h10M4 12h16M10 19h10" />
                    </svg>
                  </button>
                </div>
              </div>
              <section className={`next-prayer-card${hasTimes ? "" : " awaiting-location"}`}>
                <div className="next-prayer-copy">
                  <button
                    className="location-button"
                    onClick={() => setShowLocation(true)}
                  >
                    <MapPin size={13} weight="fill" />
                    <span>
                      {store.location
                        ? store.location.split(",").slice(0, 2).join(",")
                        : "Choose your location"}
                    </span>
                    <CaretDown size={12} />
                  </button>
                  <h1>
                    {hasTimes
                      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                      : "A moment of peace"}
                  </h1>
                  <div className="next-prayer-tag">
                    <Landscape
                      variant={next ? PRAYER_ORDER.indexOf(next.prayer) : 0}
                    />
                    <span>
                      {next
                        ? `Until ${next.prayer} prayer`
                        : "Your daily prayer companion"}
                    </span>
                  </div>
                </div>
                <ClockFace now={now} />
              </section>
              <div className="hero-shortcuts">
                <button onClick={() => go("alarm")}>
                  <Alarm size={18} /> Alarm
                </button>
                <button onClick={() => go("stats")}>
                  <ChartBar size={18} /> Statistics
                </button>
              </div>
              <StreakGoals prayers={journal} quran={quranJournal} hadith={hadithJournal} onHadith={openHadith} now={now} onQuran={() => go("quran")} onPrayers={openPrayerTracker} onStreaks={() => go("streaks")} />
              <div className="hero-date-strip">
                <time dateTime={today} aria-label="Gregorian date">
                  {gregorianDateFormat.format(now)}
                </time>
                <time
                  dateTime={today}
                  aria-label="Hijri date"
                  title="Umm al-Qura calendar"
                >
                  {hijriDate}
                </time>
              </div>
            </section>
            <section className="prayer-sheet">
              <div className="sheet-handle" />
              <div className="today-heading">
                <span className="mini-mosque">
                  <House size={20} />
                </span>
                <div>
                  <h2>Today’s prayers</h2>
                  <p>
                    {now.toLocaleDateString("en", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <span className="completed-pill">
                  {done.length}/5 <Check size={12} />
                </span>
              </div>
              {locationAccuracy !== null && <p className="location-accuracy" role="status">Current location accuracy: about {Math.round(locationAccuracy)} metres.</p>}
              {locationError && (
                <p className="inline-error" role="status">
                  {locationError}
                </p>
              )}
              <div className="prayer-list">
                {PRAYER_ORDER.map((prayer, index) => (
                  <div
                    className={`prayer-row ${next?.prayer === prayer ? "upcoming" : ""}`}
                    key={prayer}
                  >
                    <Landscape variant={index} />
                    <span className="prayer-name">
                      {prayer === "Dhuhr" && prayerNow.getDay() === 5 && store.calculation.jumuahEnabled ? "Jumuah" : prayer}
                      {next?.prayer === prayer && <small>Next prayer</small>}
                    </span>
                    <time>{store.timings[prayer] || "— — : — —"}</time>
                    <span className="prayer-streak-indicator">
                      {done.includes(prayer) && <Fire size={18} weight="fill" role="img" aria-label={`${prayer} completed for today's streak`} />}
                    </span>
                    <button
                      className="prayer-sound"
                      aria-label={`${store.azan.perPrayer[prayer] ? "Mute" : "Unmute"} ${prayer} azan`}
                      onClick={() =>
                        store.setAzanSettings({
                          perPrayer: {
                            ...store.azan.perPrayer,
                            [prayer]: !store.azan.perPrayer[prayer],
                          },
                        })
                      }
                    >
                      {store.azan.perPrayer[prayer] ? (
                        <SpeakerHigh size={16} />
                      ) : (
                        <SpeakerSlash size={16} />
                      )}
                    </button>
                    <button
                      className={`prayer-check ${done.includes(prayer) ? "checked" : ""}`}
                      aria-label={`Mark ${prayer} ${done.includes(prayer) ? "incomplete" : "complete"}`}
                      aria-pressed={done.includes(prayer)}
                      disabled={!next || (dayKey(next.at) === prayerToday && index > PRAYER_ORDER.indexOf(next.prayer))}
                      title={!next ? 'Set prayer times to track prayers' : dayKey(next.at) === prayerToday && index > PRAYER_ORDER.indexOf(next.prayer) ? 'Later prayers cannot be selected yet' : 'Track this prayer'}
                      onClick={() => {
                        // Recheck at click time in case the prayer boundary has just passed.
                        const currentTime = prayerWallDate(new Date(), store.timezone);
                        const currentNext = hasTimes ? getNextPrayer(store.timings, currentTime) : null;
                        if (!currentNext || (dayKey(currentNext.at) === dayKey(currentTime) && index > PRAYER_ORDER.indexOf(currentNext.prayer))) return;
                        setJournal(previous => {
                          const completed = previous[today] || [];
                          return { ...previous, [today]: completed.includes(prayer)
                            ? completed.filter(item => item !== prayer)
                            : [...completed, prayer] };
                        });
                      }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="outline-button azan-settings-cta"
                onClick={() => go("alarm")}
              >
                <SpeakerHigh size={17} aria-hidden="true" /> Azan settings & voices
                <CaretRight size={16} aria-hidden="true" />
              </button>
              {!hasTimes && (
                <button
                  className="outline-button location-cta"
                  onClick={() => setShowLocation(true)}
                >
                  <MapPin size={15} /> Set location for prayer times
                </button>
              )}
              <button
                className="primary-button masjid-button"
                onClick={() => go("masjid")}
              >
                <MapPin size={17} /> Find a nearby masjid{" "}
                <ArrowRight size={16} />
              </button>
            </section>
            <div className="home-bottom">
              <div>
                <Sparkle size={16} />
                <span>A little consistency. A closer connection.</span>
              </div>
              <button onClick={() => go("stats")}>
                {streak} day streak <Fire weight="fill" size={17} />
              </button>
              <div
                className="visitor-count"
                role="status"
                title="Total visits. Repeat opens within 30 minutes count as one visit."
              >
                <Users size={15} aria-hidden="true" />
                <span>
                  {visitors.count !== null ? (
                    <>
                      <strong>{visitors.count.toLocaleString()}</strong>{" "}
                      {visitors.count === 1 ? "visit" : "visits"}
                    </>
                  ) : visitors.unavailable ? (
                    "Visitor count unavailable"
                  ) : (
                    "Loading visits?"
                  )}
                </span>
              </div>
            </div>
          </>
        )}
        {screen === "stats" && (
          <div className="mobile-page stats-page">
            <div className="page-title">
              <h1>Statistics</h1>
              <label>
                <select
                  aria-label="Statistics period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </label>
            </div>
            <StatisticsStreaks quran={quranJournal} hadith={hadithJournal} prayers={journal} now={now} onOpen={() => go("streaks")} />
            <div className="stat-pair">
              <article>
                <span className="stat-icon mint">
                  <HandsClapping size={24} />
                </span>
                <div>
                  <strong>{periodTotal}</strong>
                  <p>Prayers completed</p>
                </div>
                <span className="stat-caption">
                  {period === "week"
                    ? "Over the last 7 days"
                    : "Over the last 30 days"}
                </span>
              </article>
              <article>
                <span className="stat-icon peach">
                  <Check size={24} />
                </span>
                <div>
                  <strong>
                    {
                      Object.entries(journal).filter(
                        ([date, prayers]) =>
                          date >= dayKey(periodStart) &&
                          date <= today &&
                          prayers.length === 5,
                      ).length
                    }
                  </strong>
                  <p>Complete days</p>
                </div>
                <span className="stat-caption">Every prayer matters</span>
              </article>
            </div>
            <div className="calendar-title">
              <h2>
                {month.toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div>
                <button
                  aria-label="Previous month"
                  onClick={() => setMonthOffset((v) => v - 1)}
                >
                  <CaretLeft size={17} />
                </button>
                <button
                  aria-label="Next month"
                  disabled={monthOffset >= 0}
                  onClick={() => setMonthOffset((v) => v + 1)}
                >
                  <CaretRight size={17} />
                </button>
              </div>
            </div>
            <section className="prayer-calendar">
              <div className="calendar-grid">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span className="weekday" key={i}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: month.getDay() }, (_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: totalDays }, (_, i) => {
                  const date = dayKey(
                    new Date(month.getFullYear(), month.getMonth(), i + 1),
                  );
                  const count = journal[date]?.length || 0;
                  return (
                    <span
                      key={date}
                      title={`${i + 1}: ${count} of 5 prayers`}
                      className={`calendar-day ${date === today ? "is-today" : ""} ${count === 5 ? "all-done" : count ? "some-done" : ""}`}
                    >
                      {count === 5 ? <Fire size={18} weight="fill" /> : i + 1}
                    </span>
                  );
                })}
              </div>
              <p>
                <i /> All five prayers completed
              </p>
            </section>
            <div className="progress-pair">
              <article>
                <h3>
                  <HandsClapping size={18} /> Salah today
                </h3>
                <div
                  className="progress-ring"
                  style={{
                    background: `conic-gradient(#50a99b ${done.length * 20}%, #f9cd91 0)`,
                  }}
                >
                  <div>
                    <strong>{done.length}/5</strong>
                    <small>Prayers</small>
                  </div>
                </div>
              </article>
              <article>
                <h3>
                  <BookOpen size={18} /> A daily reminder
                </h3>
                <p className="gentle-note">
                  Make time for
                  <br />
                  what brings
                  <br />
                  <em>you peace.</em>
                </p>
              </article>
            </div>
            <button className="primary-button" onClick={() => go("home")}>
              Track today’s prayers <ArrowRight size={16} />
            </button>
          </div>
        )}
        {screen === "dua" && <MobileDuas hadithJournal={hadithJournal} onHadithRead={(day, number) => {
          if (day !== hadithDay(new Date()) || !dailyHadithNumbers(day).includes(number)) return;
          setHadithJournal(previous => {
            const read = previous[day] || [];
            const key = String(number);
            return { ...previous, [day]: read.includes(key) ? read.filter(item => item !== key) : [...read, key] };
          });
        }} />}
        {screen === "quran" && <MobileQuran readToday={quranJournal[today] || []} onMarkRead={(surah, ayah) => {
          const key = `${surah}:${ayah}`;
          const date = dayKey(new Date());
          setQuranJournal(previous => {
            const read = previous[date] || [];
            return { ...previous, [date]: read.includes(key) ? read.filter(value => value !== key) : [...read, key] };
          });
        }} />}
        {(screen === "settings" || screen === "manual-times" || screen === "notification-settings") && <MobileSettings
          key={screen}
          initialManual={screen === "manual-times"}
          initialNotifications={screen === "notification-settings"}
          onReset={resetSettings}
          onBack={() => goBack()}
          onLocation={loadTimes}
          onCalculation={saveCalculation}
          hijriOffset={hijriOffset}
          onHijriOffset={setHijriOffset}
          hijriDate={hijriDate}
        />}
        {screen === "themes" && (
          <div className="mobile-page">
            {header("Theme", "profile")}
            <p className="page-subtitle">A little change of scenery.</p>
            {themeNames.map((name, index) => (
              <article
                className={`theme-card theme-preview-${index}`}
                key={name}
              >
                <div className="theme-art">
                  <MosqueScene night={index === 1} />
                  {index === 2 && (
                    <span className="theme-art-moon">
                      <Moon size={40} />
                    </span>
                  )}
                </div>
                <div>
                  <h2>{name}</h2>
                  <button
                    className={theme === index ? "selected-theme" : ""}
                    onClick={() => setTheme(index)}
                  >
                    {theme === index ? (
                      <>
                        <Check size={13} /> Applied
                      </>
                    ) : (
                      "Use theme"
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {screen === "streaks" && <div className="mobile-page">{header("Streaks & daily goals", "profile")}<p className="page-subtitle">A little consistency, every day.</p><StreakGoals expanded prayers={journal} quran={quranJournal} hadith={hadithJournal} onHadith={openHadith} now={now} onQuran={() => go("quran")} onPrayers={openPrayerTracker} /></div>}
        {screen === "profile" && (
          <div className="mobile-page">
            <div className="page-title">
              <h1>Your space</h1>
              <button
                className="day-night-toggle"
                type="button"
                role="switch"
                aria-checked={night}
                aria-label="Night mode"
                title={night ? "Switch to day mode" : "Switch to night mode"}
                onClick={() => setNight((value) => !value)}
              >
                <Sun size={17} aria-hidden="true" />
                <span className="day-night-track" aria-hidden="true">
                  <span />
                </span>
                <Moon size={17} aria-hidden="true" />
                <span className="day-night-label">
                  {night ? "Night" : "Day"}
                </span>
              </button>
            </div>
            <GoogleProfileCard streak={streak} />
            <h2 className="section-label">Make it yours</h2>
            <div className="settings-list">
              {[
                {
                  title: "Settings",
                  sub: "Prayer times, reminders & calendar",
                  icon: GearSix,
                  page: "settings",
                },
                {
                  title: "Streaks & daily goals",
                  sub: "Quran, namaz & Hadith journey",
                  icon: Fire,
                  page: "streaks",
                },
                {
                  title: "Appearance",
                  sub: themeNames[theme],
                  icon: Palette,
                  page: "themes",
                },
                {
                  title: "Prayer location",
                  sub: store.location || "Set your city",
                  icon: MapPin,
                  page: "location",
                },
                {
                  title: "Azan & reminders",
                  sub: "Your call to prayer",
                  icon: Alarm,
                  page: "alarm",
                },
                {
                  title: "Qibla direction",
                  sub: "Find your direction",
                  icon: Compass,
                  page: "qibla",
                },
                {
                  title: "Names of Allah",
                  sub: "Discover Asma ul Husna",
                  icon: Sparkle,
                  page: "asma",
                },
                {
                  title: "Masjid finder",
                  sub: "A place to reconnect",
                  icon: House,
                  page: "masjid",
                },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() =>
                    item.page === "location"
                      ? setShowLocation(true)
                      : go(item.page as Screen)
                  }
                >
                  <span className="setting-icon">
                    <item.icon size={22} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </span>
                  <CaretRight size={16} />
                </button>
              ))}
            </div>
            <ProfileGuides onOpen={go} />
            <ProfileOther />
            <p className="profile-footer">
              Awqat Al-Salah · Made for your everyday faith
              <br />
              Your activity is saved on this device.
            </p>
          </div>
        )}
        {screen === "prayer-guide" && <PrayerGuide onBack={() => goBack("profile")} />}
        {screen === "wudu-guide" && <PrayerGuide kind="wudu" onBack={() => goBack("profile")} />}
        {screen === "islamic-calendar" && (
          <div className="mobile-page">
            {header("Islamic Calendar", "profile")}
            <IslamicCalendar today={now} hijriOffset={hijriOffset} />
          </div>
        )}
        {screen === "masjid" && (
          <div className="masjid-page">
            {header("Masjid finder")}
            <div className="map-container">
              {store.location ? (
                <iframe
                  title="Nearby masjids map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`mosques near ${store.coords.lat !== null ? `${store.coords.lat},${store.coords.lon}` : store.location}`)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="map-empty">
                  <MapPin size={50} weight="duotone" />
                  <span>Your next place of peace</span>
                </div>
              )}
            </div>
            <section className="masjid-sheet">
              <span className="setting-icon">
                <MapPin size={26} />
              </span>
              <h2>Find your nearest masjid</h2>
              <p>
                {store.location
                  ? `Explore masjids around ${store.location.split(",").slice(0, 2).join(",")}. Open Maps for current listings, reviews, and directions.`
                  : "Choose your location to discover masjids nearby and find your way to the next prayer."}
              </p>
              <button
                className="outline-button"
                onClick={() => setShowLocation(true)}
              >
                <MapPin size={16} />
                {store.location ? "Change location" : "Choose location"}
              </button>
              {store.location && (
                <a
                  className="primary-button"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`mosques near ${store.coords.lat},${store.coords.lon}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <NavigationArrow size={17} /> Explore in Google Maps{" "}
                  <ArrowRight size={16} />
                </a>
              )}
            </section>
          </div>
        )}
        {screen === "alarm" && (
          <div className="mobile-page legacy-mobile">
            {header("Azan & reminders", "profile")}
            <button
              type="button"
              className="outline-button azan-settings-cta"
              onClick={() => go("manual-times")}
            >
              <SlidersHorizontal size={20} aria-hidden="true" /> Manual prayer-time adjustments
              <CaretRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="outline-button azan-settings-cta"
              onClick={() => go("notification-settings")}
            >
              <Bell size={20} aria-hidden="true" /> Notification settings
              <CaretRight size={16} aria-hidden="true" />
            </button>
            <AzanVoices />
            <AzanPanel />
          </div>
        )}
        {screen === "qibla" && (
          <div className="mobile-page qibla-page">
            {header("Qibla direction", "profile")}
            <QiblaPage />
          </div>
        )}
        {screen === "asma" && (
          <div className="mobile-page asma-page">
            {header("Asmaul Husna", "profile")}
            <AsmaPage />
          </div>
        )}
      </main>
      {store.quietMessage && <div className="quiet-status-toast" role="status">
        <SpeakerSlash size={19} /><span>{store.quietMessage}</span>
        <button className="icon-button" aria-label="Dismiss silent mode message" onClick={() => store.setQuietStatus(store.quietActive, "")}><X size={18} /></button>
      </div>}
      <nav className="mobile-nav" aria-label="Main navigation">
        {nav.map((item) => (
          <button
            key={item.key}
            onClick={() => go(item.key)}
            aria-current={screen === item.key ? "page" : undefined}
            className={screen === item.key ? "active" : ""}
          >
            <item.icon
              size={23}
              weight={screen === item.key ? "duotone" : "regular"}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <dialog
        ref={locationDialog}
        className="location-dialog"
        onCancel={() => setShowLocation(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowLocation(false);
        }}
        aria-labelledby="location-title"
      >
        <div className="dialog-heading">
          <h2 id="location-title">Your prayer location</h2>
          <button
            className="icon-button"
            aria-label="Close location"
            onClick={() => setShowLocation(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p>Find the prayer times for your day.</p>
        <button
          className="primary-button"
          onClick={detectLocation}
          disabled={busy}
        >
          <NavigationArrow size={18} />
          {busy ? locationPhase || "Finding your prayer times…" : "Use my current location"}
        </button>
        <p className="location-accuracy">Allow location access and turn on Precise Location/GPS on your phone.</p>
        <div className="or-divider">or search a city</div>
        {showLocation && <CitySearch busy={busy} onSelect={selectCity} />}
        {locationError && (
          <p className="inline-error" role="alert">
            {locationError}
          </p>
        )}
        <p className="location-method">
          <GearSix size={13} /> {CALCULATION_METHODS.find((method) => method.id === store.calculation.method)?.label}
          {" · "}{store.calculation.school === 1 ? "Hanafi" : "Standard"} Asr
        </p>
      </dialog>
    </div>
  );
}
