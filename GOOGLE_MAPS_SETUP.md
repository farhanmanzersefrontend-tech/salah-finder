# Mosque finder setup

The finder requests a fresh browser GPS location before searching. It marks the device position, shows reported accuracy and a 1,000 metre circle, and sorts mosque results by straight-line distance. GPS accuracy depends on the device and its location permissions; Google Maps does not bypass browser permissions or provide an exact device position itself.

## Use Google Maps and Google mosque listings

1. In a Google Cloud project with billing enabled, enable **Maps JavaScript API** and **Places API (New)**.
2. Create a browser API key. Restrict it to those two APIs and HTTP referrers for your deployed website and local development URLs.
3. Add this setting to your existing `.env.local`:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_browser_key
   ```

4. Optionally configure a production JavaScript map ID with `VITE_GOOGLE_MAPS_MAP_ID`. The development default is `DEMO_MAP_ID`.
5. Restart Vite. For deployment, configure the same environment variables in your hosting provider and rebuild.
6. Open the finder over HTTPS or localhost. Allow location access; on mobile, enable Precise Location. Check the blue location marker and reported accuracy, then the mosque markers and matching list.

Google Nearby Search returns up to 20 results per query. This finder requests `mosque` places restricted to a 1 km circle and ranked by distance. It also checks distances before displaying results. It cannot guarantee a complete list of every mosque or real-time prayer schedules.

## Without a Google key

The finder uses Leaflet, OpenStreetMap tiles, and Overpass mosque listings. The location marker, radius, mosque markers, list selection and route preview stay in one interactive map. An Open Google Maps control provides external Google search/directions. Google API failures also fall back to this map with a visible notice.

The old iframe and `VITE_GOOGLE_MAPS_EMBED_API_KEY` integration are no longer used. An Embed API key or Firebase key does not replace a Maps JavaScript/Places key.

## Verify

```text
npm.cmd run build
node --test scripts/google-mosques.test.mjs scripts/prayer-location.test.mjs scripts/nearby-mosques.test.mjs scripts/mosque-route.test.mjs
```

Automated tests mock Google responses and device positions. They do not validate your Google Cloud permissions, billing, API key or real device GPS. Validate these on your phone after configuration.

References: [Google device location](https://developers.google.com/maps/documentation/javascript/geolocation), [Nearby Search](https://developers.google.com/maps/documentation/javascript/nearby-search), [API setup](https://developers.google.com/maps/documentation/javascript/get-api-key).
