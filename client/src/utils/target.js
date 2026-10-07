// Target price range helpers.
// Default target = market + 2.5%  to  market + 5%   (market 10 → "10.25 - 10.5", market 100 → "102.5 - 105").
// A target typed by the admin is stored and used instead of the default.
export const TARGET_MIN_PCT = 2.5;   // % added to market for the low end
export const TARGET_MAX_PCT = 5;     // % added to market for the high end

const fmtN = n => String(Math.round(Number(n) * 100) / 100);
const isNum = v => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));
// market + pct%, rounded to paise without floating-point drift (93 + 2.5% = 95.33, not 95.32)
const addPct = (m, pct) => Math.round((m * Math.round((100 + pct) * 10)) / 10) / 100;

// "10.25 - 10.5" for a market price, '' when there is no market price
export const defaultTarget = market => {
  if (!isNum(market) || Number(market) <= 0) return '';
  const m = Number(market);
  return `${fmtN(addPct(m, TARGET_MIN_PCT))} - ${fmtN(addPct(m, TARGET_MAX_PCT))}`;
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
