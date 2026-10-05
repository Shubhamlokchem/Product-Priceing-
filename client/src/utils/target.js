// Target price range helpers.
// Default target = market + ₹2  to  market + ₹5, (market 60 → "62 - 65", market 70 → "72 - 75", market 50.5 → "52.5 - 55.5").
// A target typed by the admin is stored and used instead of the default.
export const TARGET_MIN_ADD = 2;   // rupees added to market for the low end
export const TARGET_MAX_ADD = 5;   // rupees added to market for the high end

const fmtN = n => String(Math.round(Number(n) * 100) / 100);
const isNum = v => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));

// "12 - 15" for a market price, '' when there is no market price
export const defaultTarget = market => {
  if (!isNum(market) || Number(market) <= 0) return '';
  const m = Number(market);
  return `${fmtN(m + TARGET_MIN_ADD)} - ${fmtN(m + TARGET_MAX_ADD)}`;
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
