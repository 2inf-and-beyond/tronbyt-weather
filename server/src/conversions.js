// Ported from pi-weather-station client/src/services/conversions.js.
// tomorrow.io is always queried in metric; these convert to the requested units.

const cToF = (c) => c * (9 / 5) + 32;
const msToMph = (ms) => ms / 0.44704;

/**
 * @param {number} c degrees celsius
 * @param {"imperial"|"metric"} units
 * @returns {number|null}
 */
function convertTemp(c, units) {
  if (c == null) return null;
  return Math.round(units === "imperial" ? cToF(c) : c);
}

/**
 * @param {number} ms speed in m/s
 * @param {"imperial"|"metric"} units
 * @returns {number|null} mph or m/s
 */
function convertSpeed(ms, units) {
  if (ms == null) return null;
  return Math.round(units === "imperial" ? msToMph(ms) : ms);
}

module.exports = { convertTemp, convertSpeed };
