// Target price range helpers.
// Default target = market + 20%  to  market + 50%   (market 10 → "12 - 15").
// A target typed by the admin is stored and used instead of the default.
export const TARGET_MIN_PCT = 20;
export const TARGET_MAX_PCT = 50;

const fmtN = n => String(Math.round(Number(n) * 100) / 100);
const isNum = v => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));

// "12 - 15" for a market price, '' when there is no market price
export const defaultTarget = market => {
  if (!isNum(market) || Number(market) <= 0) return '';
  const m = Number(market);
  return `${fmtN(m * (1 + TARGET_MIN_PCT / 100))} - ${fmtN(m * (1 + TARGET_MAX_PCT / 100))}`;
};

// Stored numbers → text ("12 - 15", or "12" when there is only one number)
export const storedTargetText = (target, targetMax) => {
  if (!isNum(target)) return '';
  return isNum(targetMax) && Number(targetMax) !== Number(target) ? `${fmtN(target)} - ${fmtN(targetMax)}` : fmtN(target);
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
  return { target: lo, targetMax: hi === lo ? null : hi };
};
