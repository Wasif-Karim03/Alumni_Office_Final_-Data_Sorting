/**
 * Shared utility functions for OWU Alumni Analytics backend
 */

export function toNum(val) {
  if (val == null || val === '') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

export function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function countBy(arr, fn) {
  const map = {};
  arr.forEach((item) => {
    const key = fn(item);
    if (key != null && key !== '') map[key] = (map[key] || 0) + 1;
  });
  return map;
}

export function sortDesc(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

export function sumCol(rows, key) {
  return rows.reduce((s, r) => s + (toNum(r[key]) || 0), 0);
}

export function decadeOf(year) {
  const y = Math.floor(year / 10) * 10;
  return `${y}s`;
}

/**
 * Partial match (case-insensitive) — returns first matching column name
 */
export function findCol(row, partial) {
  if (!row) return null;
  const lower = partial.toLowerCase();
  return Object.keys(row).find((k) => k.toLowerCase().includes(lower)) || null;
}

/**
 * Exact match — returns LAST matching column (important for "State" which appears twice)
 */
export function findColExact(row, name) {
  if (!row) return null;
  const matches = Object.keys(row).filter((k) => k === name);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
