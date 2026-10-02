// Ported from parseWeatherCode in pi-weather-station
// client/src/components/CurrentWeather/index.js.
// https://docs.tomorrow.io/reference/data-layers-weather-codes
//
// `icon` is a key the Pixlet app maps to a sprite. `dayNight: true` icons
// get a `_day` / `_night` suffix.

const CODES = {
  1000: { desc: "Clear", icon: "clear", dayNight: true },
  1100: { desc: "Mostly clear", icon: "partly_cloudy", dayNight: true },
  1101: { desc: "Partly cloudy", icon: "partly_cloudy", dayNight: true },
  1102: { desc: "Mostly cloudy", icon: "cloudy" },
  1001: { desc: "Cloudy", icon: "cloudy" },
  2000: { desc: "Fog", icon: "fog" },
  2100: { desc: "Light fog", icon: "fog" },
  3000: { desc: "Light wind", icon: "wind" },
  3001: { desc: "Wind", icon: "wind" },
  3002: { desc: "Strong wind", icon: "wind" },
  4000: { desc: "Drizzle", icon: "drizzle" },
  4200: { desc: "Light rain", icon: "rain" },
  4001: { desc: "Rain", icon: "rain" },
  4201: { desc: "Heavy rain", icon: "rain" },
  5001: { desc: "Flurries", icon: "snow" },
  5100: { desc: "Light snow", icon: "snow" },
  5000: { desc: "Snow", icon: "snow" },
  5101: { desc: "Heavy snow", icon: "snow" },
  6000: { desc: "Freezing drizzle", icon: "sleet" },
  6200: { desc: "Light freezing rain", icon: "sleet" },
  6001: { desc: "Freezing rain", icon: "sleet" },
  6201: { desc: "Heavy freezing rain", icon: "sleet" },
  7102: { desc: "Light ice pellets", icon: "sleet" },
  7000: { desc: "Ice pellets", icon: "sleet" },
  7101: { desc: "Heavy ice pellets", icon: "sleet" },
  8000: { desc: "Thunderstorm", icon: "thunder" },
};

/**
 * @param {number} code tomorrow.io weatherCode
 * @param {boolean} [isDay=true]
 * @returns {{desc: string, icon: string}}
 */
function parseWeatherCode(code, isDay = true) {
  const entry = CODES[code];
  if (!entry) return { desc: "Unknown", icon: "unknown" };
  const icon = entry.dayNight ? `${entry.icon}_${isDay ? "day" : "night"}` : entry.icon;
  return { desc: entry.desc, icon };
}

/**
 * Ported from isDaylight in CurrentWeather/index.js.
 *
 * @param {Date} now
 * @param {string} sunrise ISO timestamp
 * @param {string} sunset ISO timestamp
 * @returns {boolean}
 */
function isDaylight(now, sunrise, sunset) {
  const t = now.getTime();
  return t > new Date(sunrise).getTime() && t < new Date(sunset).getTime();
}

module.exports = { parseWeatherCode, isDaylight };
