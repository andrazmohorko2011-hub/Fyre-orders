// Parses strings like "10m", "2h", "1d", "1d12h30m" into milliseconds.
const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

function parseDuration(input) {
  if (!input) return null;
  const regex = /(\d+)\s*(w|d|h|m|s)/gi;
  let match;
  let total = 0;
  let matched = false;

  while ((match = regex.exec(input)) !== null) {
    matched = true;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    total += value * UNITS[unit];
  }

  if (!matched) return null;
  return total;
}

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const units = [
    ['d', UNITS.d],
    ['h', UNITS.h],
    ['m', UNITS.m],
    ['s', UNITS.s],
  ];
  const parts = [];
  let remaining = ms;
  for (const [label, size] of units) {
    const value = Math.floor(remaining / size);
    if (value > 0) {
      parts.push(`${value}${label}`);
      remaining -= value * size;
    }
  }
  return parts.length ? parts.join(' ') : '0s';
}

module.exports = { parseDuration, formatDuration };
