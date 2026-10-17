// Optional live diagnostic. Defaults to public coordinates in central Hyderabad.
import mosques from '../api/mosques.js';
const lat = Number(process.argv[2] || 17.385);
const lon = Number(process.argv[3] || 78.4867);
if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Invalid coordinates');
const query = `[out:json][timeout:15];nwr["religion"="muslim"](around:1000,${lat},${lon});out center tags;`;
if (process.argv.includes('--proxy')) {
  const response = await mosques.fetch(new Request('https://salah-finder.example/api/mosques', { method: 'POST', body: JSON.stringify({ lat, lon }) }));
  const data = await response.json();
  console.log(JSON.stringify({ status: response.status, count: data.elements?.length, error: data.error }));
  if (!response.ok) process.exitCode = 1;
  process.exit(process.exitCode || 0);
}
await Promise.all(['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'].map(async endpoint => {
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'User-Agent': 'SalahFinder/1.0 (nearby mosque map; OpenStreetMap)', Accept: 'application/json' }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { console.log(JSON.stringify({ endpoint, status: response.status, message: body.slice(0, 300) })); process.exitCode = 1; return; }
    console.log(JSON.stringify({ endpoint, status: response.status, count: data.elements?.length, remark: data.remark }));
  } catch (error) { console.log(JSON.stringify({ endpoint, error: error.message, cause: error.cause?.code })); process.exitCode = 1; }
}));
