import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowCounterClockwise, ArrowLeft, Bell, CalendarBlank, CaretRight, Clock, GearSix, MapPin, Moon, SpeakerSlash } from "phosphor-react";
import { CALCULATION_METHODS, usePrayerStore } from "../../store/usePrayerStore";
import type { CalculationSettings } from "../../store/usePrayerStore";
import { PRAYER_ORDER } from "../../utils/prayerNames";
import { DEFAULT_CALCULATION, PRAYER_EVENTS, validateCoordinates } from "../../utils/prayerPreferences";
import { currentPrayerLocation } from "../../utils/prayerLocation";
import { getNotificationPermission, isNotificationSupported, requestNotificationPermission } from "../../utils/notify";
import { unlockAudio } from "../../utils/playAzan";
import CitySearch, { cityLabel } from "./CitySearch";
import { MinuteField, SettingRow, SettingToggle, SettingsSheet } from "./SettingsControls";
import "./settings.css";

const sections = [
  { id: "prayer", title: "Prayer Times Settings", description: "Settings for calculating prayer times", icon: Clock },
  { id: "location", title: "Location Settings", description: "Choose your location settings", icon: MapPin },
  { id: "notifications", title: "Notification Settings", description: "Select your notifications & reminders", icon: Bell },
  { id: "silent", title: "Silent Settings", description: "Quiet moments for every prayer", icon: SpeakerSlash },
  { id: "hijri", title: "Hijri Settings", description: "Hijri date adjustment", icon: CalendarBlank },
] as const;
const sheetTitles = {
  method: "Calculation Method", school: "Juristic Method", highLatitude: "Higher Latitude Adjustment",
  daylight: "Daylight Saving Time", jumuah: "Jumuah Prayer Time", manual: "Manual Times Adjustments",
  location: "Location Settings", locationMethod: "Location Method", search: "Search for Location", coordinates: "Manual Location", locationInfo: "Location Info",
  notifications: "Notification Settings", reminderTimes: "Prayer Notification Times",
  silent: "Silent Settings", silentTimes: "Silent Time Settings", mute: "Prayer Sound",
};
type Sheet = keyof typeof sheetTitles;
const highLatitudeOptions = [{ id: 1, label: "Middle of the night" }, { id: 2, label: "One seventh of the night" }, { id: 3, label: "Angle based" }];
const offsetLabel = (minutes: number) => minutes === 0 ? "At prayer time" : `${Math.abs(minutes)} min ${minutes < 0 ? "before" : "after"}`;

export default function MobileSettings({ onBack, onLocation, onCalculation, onReset, hijriOffset, onHijriOffset, hijriDate }: {
  onBack: () => void;
  onLocation: (lat: number, lon: number, label: string) => Promise<void>;
  onCalculation: (settings: CalculationSettings) => Promise<void>;
  onReset: () => void;
  hijriOffset: number;
  onHijriOffset: (days: number) => void;
  hijriDate: string;
}) {
  const store = usePrayerStore();
  const [page, setPage] = useState<"prayer" | "hijri" | null>(null);
  const [trail, setTrail] = useState<Sheet[]>([]);
  const sheet = trail[trail.length - 1];
  const [calculation, setCalculation] = useState(store.calculation);
  const [reminders, setReminders] = useState(store.reminders);
  const [silent, setSilent] = useState(store.silent);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function openSheet(id: Sheet) {
    setCalculation(store.calculation); setReminders(store.reminders); setSilent(store.silent);
    setMessage(""); setError("");
    if (id === "coordinates") {
      setLatitude(store.coords.lat?.toString() || ""); setLongitude(store.coords.lon?.toString() || ""); setLocationName(store.location);
    }
    setTrail(previous => [...previous, id]);
  }
  function closeSheet() { setTrail([]); setMessage(""); setError(""); }
  function backSheet() { setTrail(previous => previous.slice(0, -1)); setMessage(""); setError(""); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage(""); setError("");
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save settings. Please try again."); }
    finally { setBusy(false); }
  }
  const saveCalculation = (settings = calculation, close = true) => run(async () => {
    await onCalculation(settings);
    if (close) backSheet();
    setMessage("Prayer time settings saved.");
  });
  const selectLocation = (lat: number, lon: number, label: string) => run(async () => {
    await onLocation(lat, lon, label);
    setTrail(["location"]); setMessage("Location and prayer times updated.");
  });
  async function toggleNotifications(enabled: boolean) {
    if (!enabled) { store.setAzanSettings({ notificationsEnabled: false }); return; }
    await run(async () => {
      const permission = await requestNotificationPermission();
      store.setAzanSettings({ notificationsEnabled: permission === "granted" });
      if (permission !== "granted") throw new Error("Allow notifications in your browser's site settings to receive reminders.");
    });
  }
  const status = <>{message && <p className="settings-status" role="status">{message}</p>}{error && <p className="inline-error" role="alert">{error}</p>}</>;
  const saveButton = <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>;
  const calculationForm = (children: ReactNode) => <form onSubmit={e => { e.preventDefault(); void saveCalculation(); }}><fieldset disabled={busy}>{children}{saveButton}</fieldset></form>;

  return <div className="mobile-page settings-page">
    <header className="mobile-header">
      <button className="icon-button back-button" aria-label={page ? "Back to settings" : "Go back"} onClick={() => { if (page) { setPage(null); setMessage(""); setError(""); } else onBack(); }} disabled={busy}><ArrowLeft size={19} /></button>
      <h1>{page === "prayer" ? "Prayer Times Settings" : page === "hijri" ? "Hijri Settings" : "Settings"}</h1>
      {page === "prayer" ? <button className="icon-button back-button" aria-label="Location settings" disabled={busy} onClick={() => openSheet("location")}><MapPin size={20} /></button> : <span className="header-spacer" />}
    </header>

    {!page && <>
      <div className="settings-intro"><span className="settings-intro-icon"><GearSix size={28} weight="duotone" /></span><div><h2>A little more personal.</h2><p>Your prayers, your preferences.</p></div></div>
      <div className="settings-menu">{sections.map(({ id, title, description, icon: Icon }) => <button className="settings-menu-card" key={id} onClick={() => {
        setMessage(""); setError("");
        if (id === "prayer" || id === "hijri") { setPage(id); window.scrollTo({ top: 0 }); } else openSheet(id);
      }}><span className="settings-card-icon"><Icon size={23} weight="duotone" /></span><span className="settings-card-copy"><strong>{title}</strong><small>{description}</small></span><CaretRight className="settings-chevron" size={18} aria-hidden="true" /></button>)}</div>
      <button type="button" className="outline-button settings-spaced" disabled={busy} onClick={() => { void run(async () => {
        onReset();
        const defaults = usePrayerStore.getState();
        setCalculation(defaults.calculation); setReminders(defaults.reminders); setSilent(defaults.silent);
        setMessage("Settings reset to defaults. Choose your location to see prayer times.");
      }); }}><ArrowCounterClockwise size={18} aria-hidden="true" />Reset settings</button>
      <p className="settings-hint">Restore all settings, including appearance, to their defaults and clear your saved location. Your prayer history is kept.</p>
      <p className="settings-footnote">Made for your everyday faith.<br />Your preferences are saved on this device.</p>
    </>}

    {page === "prayer" && <>
      <p className="page-subtitle">Prayer times that follow your local practice.</p>
      <h2 className="settings-group-title">Calculations</h2>
      <div className="settings-detail-list">
        <SettingRow title="Methods" description={CALCULATION_METHODS.find(method => method.id === store.calculation.method)?.label || "Choose a method"} onClick={() => openSheet("method")} disabled={busy} />
        <SettingRow title="Juristic Method" description={store.calculation.school === 1 ? "Hanafi" : "Standard (Shafi, Maliki, Hanbali)"} onClick={() => openSheet("school")} disabled={busy} />
        <SettingRow title="Higher Latitude Adjustment" description={highLatitudeOptions.find(option => option.id === store.calculation.highLatitude)?.label || "Angle based"} onClick={() => openSheet("highLatitude")} disabled={busy} />
        <SettingToggle title="Adjust Isha in Ramadan" description="Umm al-Qura: use 120 minutes after Maghrib in Ramadan." checked={store.calculation.ramadanIsha} onChange={enabled => { void saveCalculation({ ...store.calculation, ramadanIsha: enabled }, false); }} disabled={busy || store.calculation.method !== 4} />
      </div>
      <h2 className="settings-group-title">Times</h2>
      <div className="settings-detail-list">
        <SettingRow title="Adjust Daylight Saving Time" description={store.calculation.daylightOffset === 0 ? "Automatic for your location" : `${store.calculation.daylightOffset > 0 ? "+" : ""}${store.calculation.daylightOffset} minutes from local time`} onClick={() => openSheet("daylight")} disabled={busy} />
        <SettingRow title="Jumuah Prayer Time" description={store.calculation.jumuahEnabled ? `Friday prayer at ${store.calculation.jumuahTime}` : "Use your local Friday congregation time"} onClick={() => openSheet("jumuah")} disabled={busy} />
        <SettingRow title="Manual Times Adjustments" description="Fine-tune each prayer by up to 60 minutes" onClick={() => openSheet("manual")} disabled={busy} />
      </div>
    </>}

    {page === "hijri" && <>
      <p className="page-subtitle">Align your calendar with your local moon sighting.</p>
      <div className="settings-panel">
        <div className="settings-date-preview"><Moon size={26} weight="duotone" /><span>Today's Hijri date</span><strong>{hijriDate}</strong></div>
        <label className="settings-field">Date adjustment<select value={hijriOffset} onChange={e => onHijriOffset(Number(e.target.value))}>{[-2, -1, 0, 1, 2].map(offset => <option key={offset} value={offset}>{offset === 0 ? "No adjustment" : `${offset > 0 ? "+" : ""}${offset} ${Math.abs(offset) === 1 ? "day" : "days"}`}</option>)}</select></label>
        <p className="settings-hint">Uses the Umm al-Qura calendar. Changes are saved automatically and appear on your home screen.</p>
      </div>
    </>}
    {!sheet && status}

    {sheet && <SettingsSheet title={sheetTitles[sheet]} busy={busy} onClose={closeSheet} onBack={trail.length > 1 ? backSheet : undefined}>
      {sheet === "method" && calculationForm(<div className="settings-radio-list">{CALCULATION_METHODS.map(method => <label key={method.id}><span>{method.label}</span><input type="radio" name="calculation-method" value={method.id} checked={calculation.method === method.id} onChange={() => setCalculation({ ...calculation, method: method.id })} /></label>)}</div>)}
      {sheet === "school" && calculationForm(<div className="settings-radio-list">{[{ id: 0, label: "Standard (Shafi, Maliki, Hanbali)" }, { id: 1, label: "Hanafi" }].map(option => <label key={option.id}><span>{option.label}</span><input type="radio" name="juristic-method" checked={calculation.school === option.id} onChange={() => setCalculation({ ...calculation, school: option.id })} /></label>)}</div>)}
      {sheet === "highLatitude" && calculationForm(<><p className="settings-hint">Adjust Fajr and Isha where twilight lasts through the night.</p><div className="settings-radio-list">{highLatitudeOptions.map(option => <label key={option.id}><span>{option.label}</span><input type="radio" name="latitude-adjustment" checked={calculation.highLatitude === option.id} onChange={() => setCalculation({ ...calculation, highLatitude: option.id })} /></label>)}</div></>)}
      {sheet === "daylight" && calculationForm(<><p className="settings-hint">Local prayer times already include daylight saving. Apply an extra hour only if your timetable needs it.</p><label className="settings-field">Time adjustment<select value={calculation.daylightOffset} onChange={e => setCalculation({ ...calculation, daylightOffset: Number(e.target.value) })}><option value={0}>Automatic (no extra adjustment)</option><option value={60}>Add one hour (+60 minutes)</option><option value={-60}>Subtract one hour (-60 minutes)</option></select></label></>)}
      {sheet === "jumuah" && calculationForm(<><SettingToggle title="Custom Jumuah time" description="Replace Dhuhr on Fridays with your congregation time." checked={calculation.jumuahEnabled} onChange={enabled => setCalculation({ ...calculation, jumuahEnabled: enabled })} /><label className="settings-field settings-spaced">Friday prayer time<input type="time" required value={calculation.jumuahTime} onChange={e => setCalculation({ ...calculation, jumuahTime: e.target.value })} disabled={!calculation.jumuahEnabled} /></label><p className="settings-hint">Enter the final local time. Manual and daylight adjustments are not added to this time.</p></>)}
      {sheet === "manual" && calculationForm(<>
        <div className="settings-notice"><strong>Before you adjust</strong><p>Check your calculation method and location first. Use your local mosque's timetable as a reference.</p></div>
        <h3 className="settings-group-title">Adjustments</h3>
        {PRAYER_ORDER.map(prayer => <MinuteField key={prayer} title={`${prayer} time`} value={calculation.adjustments[prayer]} onChange={value => setCalculation({ ...calculation, adjustments: { ...calculation.adjustments, [prayer]: value } })} />)}
        <button type="button" className="outline-button settings-spaced" onClick={() => setCalculation({ ...calculation, adjustments: { ...DEFAULT_CALCULATION.adjustments } })}>Reset all manual adjustments</button>
        <p className="settings-hint">Reset sets these five adjustments to zero. Save to apply your changes.</p>
      </>)}

      {sheet === "location" && <>
        <div className="settings-location-summary"><MapPin size={21} /><span>{store.location || "No location selected"}</span></div>
        <div className="settings-detail-list">
          <SettingRow title="Location Method" description={store.locationPreferences.method === "gps" ? "GPS · request high accuracy" : "Network · standard accuracy"} onClick={() => openSheet("locationMethod")} disabled={busy} />
          <SettingToggle title="Use Internet" description="Look up your detected location's name online." checked={store.locationPreferences.useInternet} onChange={enabled => store.setLocationPreferences({ useInternet: enabled })} disabled={busy} />
          <SettingRow title="Search for Location" description="Find your city by name" onClick={() => openSheet("search")} disabled={busy} />
          <SettingRow title="Manual Location Setting" description="Enter latitude and longitude" onClick={() => openSheet("coordinates")} disabled={busy} />
          <SettingRow title="Location Info" description="View your saved coordinates and location" onClick={() => openSheet("locationInfo")} disabled={busy} />
        </div>
        <button type="button" className="primary-button settings-spaced" disabled={busy} onClick={() => { void run(async () => {
          const location = await currentPrayerLocation(store.locationPreferences);
          await onLocation(location.lat, location.lon, location.label); setMessage("Location and prayer times updated.");
        }); }}>{busy ? "Finding your location…" : "Use my current location"}</button>
        <p className="settings-hint">City search and prayer-time updates need an internet connection. Optional place names use OpenStreetMap.</p>
      </>}
      {sheet === "locationMethod" && <><div className="settings-radio-list">{[{ id: "gps", label: "GPS", description: "Request high accuracy" }, { id: "network", label: "Network", description: "Use standard accuracy" }].map(option => <label key={option.id}><span>{option.label}<small>{option.description}</small></span><input type="radio" name="location-method" checked={store.locationPreferences.method === option.id} onChange={() => store.setLocationPreferences({ method: option.id as "gps" | "network" })} /></label>)}</div><p className="settings-hint">Your browser chooses the available location source. This preference applies the next time you use your current location.</p></>}
      {sheet === "search" && <CitySearch busy={busy} onSelect={city => selectLocation(city.latitude, city.longitude, cityLabel(city))} />}
      {sheet === "coordinates" && <form onSubmit={e => { e.preventDefault(); void run(async () => {
        const { lat, lon } = validateCoordinates(latitude, longitude);
        await onLocation(lat, lon, locationName.trim() || "Manual location"); setTrail(["location"]); setMessage("Location and prayer times updated.");
      }); }}><fieldset disabled={busy}>
        <label className="settings-field">Latitude<input type="number" step="any" min={-90} max={90} required placeholder="e.g. 25.2048" value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
        <label className="settings-field">Longitude<input type="number" step="any" min={-180} max={180} required placeholder="e.g. 55.2708" value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
        <label className="settings-field">Location name (optional)<input maxLength={100} value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Your city or mosque" /></label>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Updating prayer times…" : "Set location"}</button>
      </fieldset></form>}
      {sheet === "locationInfo" && <dl className="settings-location-info"><div><dt>Latitude</dt><dd>{store.coords.lat ?? "Not set"}</dd></div><div><dt>Longitude</dt><dd>{store.coords.lon ?? "Not set"}</dd></div><div><dt>Name</dt><dd>{store.location || "Not set"}</dd></div><div><dt>Time zone</dt><dd>{store.timezone || "Not set"}</dd></div></dl>}

      {sheet === "notifications" && <>
        <div className="settings-detail-list">
          <SettingToggle title="Activate Notification" description="Prayer reminders in your browser" checked={store.azan.notificationsEnabled && getNotificationPermission() === "granted"} onChange={enabled => { void toggleNotifications(enabled); }} disabled={!isNotificationSupported() || busy} />
          <SettingRow title="Prayer Notification Times" description="Choose reminders and timing for each prayer" onClick={() => openSheet("reminderTimes")} disabled={busy} />
          <SettingToggle title="Notification Audio" description="Play automatic azan at prayer time" checked={store.azan.autoAzanEnabled} onChange={enabled => store.setAzanSettings({ autoAzanEnabled: enabled })} disabled={busy} />
        </div>
        {!isNotificationSupported() && <p className="settings-hint">Notifications are not supported in this browser.</p>}
        <button type="button" className="outline-button settings-spaced" disabled={busy} onClick={() => { void run(async () => {
          const unlocked = await unlockAudio(); store.setAzanSettings({ soundUnlocked: unlocked });
          if (!unlocked) throw new Error("Could not enable prayer sound. Please try again."); setMessage("Prayer sound is ready.");
        }); }}>{busy ? "Please wait…" : "Enable prayer sound"}</button>
        <p className="settings-hint">Keep the app open for reminders and azan. Reminder offsets change notification time; azan plays at prayer time.</p>
      </>}
      {sheet === "reminderTimes" && <form onSubmit={e => { e.preventDefault(); store.setReminders(reminders); backSheet(); setMessage("Prayer notification times saved."); }}>
        <p className="settings-hint">Choose a time before or after each prayer. Jumuah replaces Dhuhr reminders on Fridays.</p>
        {PRAYER_EVENTS.map(prayer => <div className="settings-rule-card" key={prayer}>
          <SettingToggle title={`${prayer} reminder`} description={offsetLabel(reminders[prayer].offset)} checked={reminders[prayer].enabled} onChange={enabled => setReminders({ ...reminders, [prayer]: { ...reminders[prayer], enabled } })} />
          <MinuteField title={`${prayer} reminder offset`} value={reminders[prayer].offset} onChange={offset => setReminders({ ...reminders, [prayer]: { ...reminders[prayer], offset } })} />
        </div>)}{saveButton}
      </form>}

      {sheet === "silent" && <>
        <div className="settings-detail-list">
          <SettingToggle title="Switch to Silent" description="Mute automatic azan during your quiet periods" checked={store.silent.enabled} onChange={enabled => store.setSilent({ enabled })} />
          <SettingRow title="Silent Time Settings" description="Set the start time and duration for each prayer" onClick={() => openSheet("silentTimes")} />
          <SettingToggle title="Vibrate on Switching" description={typeof navigator !== "undefined" && "vibrate" in navigator ? "A short vibration when quiet time starts or ends" : "Vibration is not supported in this browser"} checked={store.silent.vibrate} onChange={vibrate => store.setSilent({ vibrate })} disabled={typeof navigator === "undefined" || !("vibrate" in navigator)} />
          <SettingToggle title="Show Message on Switching" description="Show when prayer quiet time starts or ends" checked={store.silent.showMessage} onChange={showMessage => { store.setSilent({ showMessage }); if (!showMessage) store.setQuietStatus(store.quietActive, ""); }} />
          <SettingRow title="Prayer Sound" description="Always mute azan for selected prayers" onClick={() => openSheet("mute")} />
        </div>
        <p className="settings-hint">Applies to automatic prayer audio in this app while it is open. Your phone's system silent mode and other apps are unchanged.</p>
      </>}
      {sheet === "silentTimes" && <form onSubmit={e => { e.preventDefault(); store.setSilent({ prayers: silent.prayers }); backSheet(); setMessage("Silent time settings saved."); }}>
        <p className="settings-hint">Choose when quiet time begins and how long it lasts. Jumuah settings apply on Fridays.</p>
        {PRAYER_EVENTS.map(prayer => <div className="settings-rule-card" key={prayer}>
          <SettingToggle title={`${prayer} quiet period`} description={`${offsetLabel(silent.prayers[prayer].offset)} · ${silent.prayers[prayer].duration} minutes`} checked={silent.prayers[prayer].enabled} onChange={enabled => setSilent({ ...silent, prayers: { ...silent.prayers, [prayer]: { ...silent.prayers[prayer], enabled } } })} />
          <MinuteField title={`${prayer} start offset`} value={silent.prayers[prayer].offset} onChange={offset => setSilent({ ...silent, prayers: { ...silent.prayers, [prayer]: { ...silent.prayers[prayer], offset } } })} />
          <MinuteField title={`${prayer} silent period`} min={1} max={180} value={silent.prayers[prayer].duration} onChange={duration => setSilent({ ...silent, prayers: { ...silent.prayers, [prayer]: { ...silent.prayers[prayer], duration } } })} />
        </div>)}{saveButton}
      </form>}
      {sheet === "mute" && <div className="settings-detail-list">{PRAYER_ORDER.map(prayer => <SettingToggle key={prayer} title={`Mute ${prayer}`} description={store.azan.perPrayer[prayer] ? "Azan sound on" : "Azan muted"} checked={!store.azan.perPrayer[prayer]} onChange={muted => store.setAzanSettings({ perPrayer: { ...store.azan.perPrayer, [prayer]: !muted } })} />)}</div>}
      {status}
    </SettingsSheet>}
  </div>;
}
