// Ported from updateSunriseSunset in pi-weather-station client/src/AppContext.js.

/**
 * @returns {Promise<{sunrise: string, sunset: string}>} ISO timestamps (UTC)
 */
async function fetchSun({ lat, lon, fetchImpl = fetch }) {
  const res = await fetchImpl(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
  );
  if (!res.ok) throw new Error(`sunrise-sunset ${res.status}`);
  const body = await res.json();
  const { sunrise, sunset } = body?.results ?? {};
  if (!sunrise || !sunset) throw new Error("sunrise-sunset response missing results");
  return { sunrise, sunset };
}

module.exports = { fetchSun };
