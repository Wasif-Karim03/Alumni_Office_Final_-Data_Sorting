/**
 * Process CRM / Advancement export (the "2024" file)
 */
import {
  toNum,
  median,
  countBy,
  sortDesc,
  sumCol,
  decadeOf,
} from '../utils/helpers.js';

const AF_COLS = [
  'AF14 - Gifts',
  'AF15 - Gifts',
  'AF16 - Gifts',
  'AF17 - Gifts',
  'AF18 - Gifts',
  'AF19 - Gifts',
];
const AF_LABELS = ['FY14', 'FY15', 'FY16', 'FY17', 'FY18', 'FY19'];

export function analyzeCRM(rows) {
  const stats = {};

  stats.total = rows.length;

  // Constituency
  stats.constituency = countBy(rows, (r) => r['Constituency Code']);

  // Class years
  const classYears = rows
    .map((r) => toNum(r['CL YR']))
    .filter((y) => y && y > 1940 && y < 2035);
  stats.classYearCounts = countBy(classYears.map(String), (v) => v);
  stats.classDecades = countBy(classYears, decadeOf);
  stats.classYearTop = sortDesc(stats.classYearCounts).slice(0, 15);

  // Geography
  stats.states = countBy(rows, (r) => r['State']);
  stats.uniqueStates = Object.keys(stats.states).length;
  const ohioKey = Object.keys(stats.states).find((k) => k === 'OH' || k === 'Ohio') || 'OH';
  stats.ohioCount = stats.states[ohioKey] || 0;
  stats.ohioPct =
    stats.total > 0 ? Math.round((stats.ohioCount / stats.total) * 1000) / 10 : 0;

  // Greek
  const greekRows = rows.filter(
    (r) => r['Greek Affiliation'] && r['Greek Affiliation'].trim() !== ''
  );
  stats.greekTotal = greekRows.length;
  stats.greekNone = stats.total - stats.greekTotal;
  stats.greek = countBy(greekRows, (r) => r['Greek Affiliation']);

  // Majors (exclude MAUNDE)
  stats.majors = countBy(
    rows.filter((r) => r['Major'] && r['Major'] !== 'MAUNDE'),
    (r) => r['Major']
  );

  // Giving
  const ltGiving = rows.map((r) => toNum(r['LT Giving'])).filter((v) => v !== null);
  const lastGiftAmt = rows
    .map((r) => toNum(r['Last Gift Amount']))
    .filter((v) => v !== null && v > 0);

  stats.giving = {
    lifetimeTotal: ltGiving.reduce((a, b) => a + b, 0),
    lifetimeMean: ltGiving.length > 0 ? ltGiving.reduce((a, b) => a + b, 0) / ltGiving.length : 0,
    lifetimeMedian: median(ltGiving),
    lifetimeMax: Math.max(...ltGiving, 0),
    lastGiftMean:
      lastGiftAmt.length > 0 ? lastGiftAmt.reduce((a, b) => a + b, 0) / lastGiftAmt.length : 0,
    lastGiftMedian: median(lastGiftAmt),
    donorsCount: lastGiftAmt.length,
    nonDonors: stats.total - lastGiftAmt.length,
    tiers: {
      '$0': ltGiving.filter((v) => v === 0).length,
      '$1-99': ltGiving.filter((v) => v > 0 && v < 100).length,
      '$100-999': ltGiving.filter((v) => v >= 100 && v < 1000).length,
      '$1K-9.9K': ltGiving.filter((v) => v >= 1000 && v < 10000).length,
      '$10K-99K': ltGiving.filter((v) => v >= 10000 && v < 100000).length,
      '$100K+': ltGiving.filter((v) => v >= 100000).length,
    },
  };

  // FY Annual Fund
  stats.fyGiving = AF_LABELS.map((label, i) => ({
    year: label,
    amount: Math.round(sumCol(rows, AF_COLS[i])),
  }));

  // Wealth & Capacity
  stats.wealthEstimate = countBy(rows.filter((r) => r['WE Range']), (r) => r['WE Range']);
  stats.giftCapacity = countBy(
    rows.filter((r) => r['Internal Gift Capacity']),
    (r) => r['Internal Gift Capacity']
  );

  // Engagement
  const engScores = rows.map((r) => toNum(r['Eng Score'])).filter((v) => v !== null);
  stats.engScoreMean =
    engScores.length > 0
      ? Math.round((engScores.reduce((a, b) => a + b, 0) / engScores.length) * 10) / 10
      : 0;
  stats.engScoreMedian = median(engScores);

  // Employment
  stats.employers = countBy(rows.filter((r) => r['CnPrBs_Org_Name']), (r) => r['CnPrBs_Org_Name']);
  stats.positions = countBy(rows.filter((r) => r['CnPrBs_Position']), (r) => r['CnPrBs_Position']);

  // Spouse
  stats.spouseCount = rows.filter((r) => r['SP Name'] && r['SP Name'].trim() !== '').length;
  stats.spouseAlumni = rows.filter(
    (r) => r['SP CL YR'] && String(r['SP CL YR']).trim() !== ''
  ).length;

  // Names for retention (internal use only - stripped before JSON response)
  stats.names = new Set(
    rows.map((r) => (r['Name'] || '').trim().toLowerCase()).filter(Boolean)
  );

  // Emails for cross-system matching (lowercase, trimmed)
  stats.emails = new Set(
    rows
      .map((r) => (r['Email'] || '').trim().toLowerCase())
      .filter((e) => e && e.includes('@'))
  );

  // Constituent IDs for cross-system matching (RE ID = primary key)
  stats.constituentIds = new Set(
    rows
      .map((r) => String(r['ID'] || '').trim())
      .filter(Boolean)
  );

  return stats;
}
