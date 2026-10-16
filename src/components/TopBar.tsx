import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MapPin, MagnifyingGlass } from "phosphor-react";
import { usePrayerFetcher } from "../hooks/usePrayerFetcher";
import { usePrayerStore } from "../store/usePrayerStore";

const TopBar = () => {
  const storeLocation = usePrayerStore((state) => state.location);
  const coords = usePrayerStore((state) => state.coords);

  const [location, setLocation] = useState(storeLocation || "Location not selected");
  const [isFetching, setIsFetching] = useState(false);
  const [manualCity, setManualCity] = useState("");

  const setStoreLocation = usePrayerStore((state) => state.setLocation);
  const { fetchPrayerTimes } = usePrayerFetcher();

  useEffect(() => {
    if (storeLocation) setLocation(storeLocation);
  }, [storeLocation]);

  const nominatimHeaders = useMemo(
    () => ({
      // Nominatim usage policy: identify your app
      "Accept-Language": "en",
    }),
    []
  );

  // 📍 Auto-detect location
  const handleDetectLocation = () => {
    setIsFetching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: nominatimHeaders }
          );
          const address = res.data.address;
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            address.state_district ||
            address.district ||
            address.suburb ||
            address.neighbourhood ||
            "Unknown City";
          const country = address.country || "Unknown Country";
          const fullLocation = `${city}, ${country}`;
          setLocation(fullLocation);
          setStoreLocation(fullLocation);

          // fetch prayer timings
          fetchPrayerTimes(latitude, longitude);
        } catch (error) {
          console.error("Location API Error:", error);
          setLocation("Failed to fetch location");
        } finally {
          setIsFetching(false);
        }
      },
      (error) => {
        console.error("Geolocation Error:", error);
        setLocation("Location access denied");
        setIsFetching(false);
      }
    );
  };

  // 🔍 Manual search by city
  const handleManualSearch = async () => {
    if (!manualCity.trim()) return;
    setIsFetching(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
          manualCity
        )}&format=json&limit=1`,
        { headers: nominatimHeaders }
      );
      if (res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0];
        setLocation(display_name);
        setStoreLocation(display_name);
        fetchPrayerTimes(Number(lat), Number(lon));
      } else {
        setLocation("City not found");
      }
    } catch (error) {
      console.error("City search error:", error);
      setLocation("Failed to fetch city");
    } finally {
      setIsFetching(false);
      setManualCity("");
    }
  };

  const handleReset = () => {
    setLocation("Location not selected");
    setStoreLocation("");
    // keep coords/timings in store; user can reselect
  };

  const canShowSelected = location !== "Location not selected" && !!location;

  return (
    <div className="flex flex-col lg:flex-row justify-between items-center p-4 gap-3">
      <div className="flex shrink-0 items-center gap-3 lg:ml-15" aria-label="Awqat Al-Salah">
        <img src="/favicon.svg" alt="" className="h-12 w-12" />
        <span className="text-xl font-semibold tracking-tight text-[#355d57]">Awqat Al-Salah</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 w-full">
        {!canShowSelected ? (
          <>
            {/* Detect Location Button */}
            <button
              data-testid="detect-location-button"
              onClick={handleDetectLocation}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:from-purple-700 hover:to-indigo-600 transition-all duration-200"
            >
              {isFetching ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
                    ></path>
                  </svg>
                  Detecting...
                </>
              ) : (
                "📍 Detect Location"
              )}
            </button>

            {/* Manual City Input */}
            <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden w-full sm:w-auto max-w-sm">
              <input
                data-testid="manual-city-input"
                type="text"
                placeholder="Enter city name..."
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="flex-1 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                data-testid="manual-city-search-button"
                onClick={handleManualSearch}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 transition-all duration-200 flex items-center justify-center"
              >
                <MagnifyingGlass size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow border border-gray-200 w-fit">
            <MapPin size={20} className="text-purple-600" />
            <span
              data-testid="selected-location-text"
              className="text-sm font-medium text-gray-800 truncate max-w-[200px] sm:max-w-none"
              title={location}
            >
              {location}
            </span>
            <button
              data-testid="reset-location-button"
              onClick={handleReset}
              className="ml-2 text-xs text-gray-500 hover:text-red-500 transition"
              aria-label="Reset location"
              title={coords.lat && coords.lon ? `Coords: ${coords.lat}, ${coords.lon}` : ""}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
