// Target price range helpers.
// Default target = market + 2%  to  market + 5%, rounded to a whole rupee or .5 (market 93 → "95 - 98", market 100 → "102.5 - 105").
// A target typed by the admin is stored and used instead of the default.
export const TARGET_MIN_PCT = 2;     // % added to market for the low end
export const TARGET_MAX_PCT = 5;     // % added to market for the high end

const fmtN = n => String(Math.round(Number(n) * 100) / 100);
const isNum = v => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));
// market + pct%, then rounded by the FIRST digit after the decimal point (the sales team's rule):
//   .0 – .4  → drop the decimal   (22.1 … 22.4 → 22)
//   .5       → keep .5            (22.5, 22.55 → 22.5)
//   .6 – .9  → next rupee         (22.6 … 22.9 → 23)
const addPct = (m, pct) => {
  const t = Math.round(m * Math.round((100 + pct) * 10) * 10);   // value in 1/10000 of a rupee (no floating-point drift)
  const whole = Math.floor(t / 10000);
  const firstDigit = Math.floor((t - whole * 10000) / 1000);     // 0 … 9
  return firstDigit < 5 ? whole : firstDigit === 5 ? whole + 0.5 : whole + 1;
};

// "95 - 98" for a market price, '' when there is no market price
export const defaultTarget = market => {
  if (!isNum(market) || Number(market) <= 0) return '';
  const m = Number(market);
  const lo = fmtN(addPct(m, TARGET_MIN_PCT)), hi = fmtN(addPct(m, TARGET_MAX_PCT));
  return lo === hi ? lo : `${lo} - ${hi}`;   // very small prices can round to the same number
};

// Stored numbers → text ("12 - 15", or "12" when both ends are the same).
// Old single targets saved before ranges existed (no upper end) are ignored,
// so those products show the automatic range from their market price.
export const storedTargetText = (target, targetMax) => {
  if (!isNum(target) || !isNum(targetMax)) return '';
  return Number(targetMax) !== Number(target) ? `${fmtN(target)} - ${fmtN(targetMax)}` : fmtN(target);
};

// What to show: the saved target if there is one, otherwise the default from market
export const targetText = (target, targetMax, market) => storedTargetText(target, targetMax) || defaultTarget(market);

// Text typed by the admin ("12-15", "12 to 15", "12") → numbers to save.
// Empty, or the same as the default for this market → nothing is saved (default keeps following the market).
export const parseTarget = (text, market) => {
  const nums = (String(text ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/g) || []).map(Number);
  if (!nums.length) return { target: null, targetMax: null };
  const lo = Math.min(nums[0], nums[1] ?? nums[0]), hi = Math.max(nums[0], nums[1] ?? nums[0]);
  if (storedTargetText(lo, hi) === defaultTarget(market)) return { target: null, targetMax: null };
  return { target: lo, targetMax: hi };
};
