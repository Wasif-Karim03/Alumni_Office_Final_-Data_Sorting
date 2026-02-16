/**
 * Cross-year comparisons and retention analysis
 */
const STATE_MAP = {
  OH: 'Ohio',
  NY: 'New York',
  PA: 'Pennsylvania',
  IL: 'Illinois',
  MI: 'Michigan',
  CT: 'Connecticut',
  IN: 'Indiana',
  TX: 'Texas',
  CA: 'California',
  FL: 'Florida',
  CO: 'Colorado',
  MA: 'Massachusetts',
  MD: 'Maryland',
  VT: 'Vermont',
  TN: 'Tennessee',
  KY: 'Kentucky',
  GA: 'Georgia',
  ME: 'Maine',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NC: 'North Carolina',
  VA: 'Virginia',
  WA: 'Washington',
  WI: 'Wisconsin',
  AZ: 'Arizona',
  MN: 'Minnesota',
  MO: 'Missouri',
  SC: 'South Carolina',
  DC: 'District of Columbia',
};

/** Normalize state to full name for consistent geography comparison */
function normalizeStateForLookup(state) {
  if (!state || typeof state !== 'string') return null;
  const s = state.trim();
  const upper = s.toUpperCase();
  return STATE_MAP[upper] || s;
}

const WEALTH_ORDER = [
  '$1-$2,499',
  '$2,500-$4,999',
  '$5,000-$9,999',
  '$10,000-$14,999',
  '$15,000-$24,999',
  '$25,000-$49,999',
  '$50,000-$99,999',
  '$100,000-$249,999',
  '$250,000-$499,999',
  '$500,000-$999,999',
  '$1,000,000-$4,999,999',
  '$5,000,000+',
];

const WEALTH_SHORT_LABELS = [
  '$1-2.5K',
  '$2.5-5K',
  '$5-10K',
  '$10-15K',
  '$15-25K',
  '$25-50K',
  '$50-100K',
  '$100-250K',
  '$250-500K',
  '$500K-1M',
  '$1-5M',
  '$5M+',
];

export function crossAnalyze(statsCRM, statsReg) {
  const cross = {};
  const hasRE = statsCRM && statsCRM.total > 0;
  const crmNames = statsCRM?.names || new Set();

  // Name-based retention (legacy)
  const bothNames = new Set([...crmNames].filter((n) => statsReg.names?.has(n)));
  cross.retention = {
    both: bothNames.size,
    only2024: crmNames.size - bothNames.size,
    only2025: (statsReg.names?.size || 0) - bothNames.size,
  };

  // Cross-system matching: by Email
  const crmEmails = statsCRM?.emails || new Set();
  const regEmails = statsReg.emails || new Set();
  const matchedByEmail = new Set([...crmEmails].filter((e) => regEmails.has(e)));
  cross.matchByEmail = {
    matched: matchedByEmail.size,
    alumniEventOnly: regEmails.size - matchedByEmail.size,
    raisersEdgeOnly: crmEmails.size - matchedByEmail.size,
  };

  // Cross-system matching: by Constituent ID (RE ID = AlumniEvent Constituent Id)
  const crmIds = statsCRM?.constituentIds || new Set();
  const regIds = statsReg.constituentIds || new Set();
  const matchedById = new Set([...crmIds].filter((id) => regIds.has(id)));
  cross.matchByConstituentId = {
    matched: matchedById.size,
    alumniEventOnly: regIds.size - matchedById.size,
    raisersEdgeOnly: crmIds.size - matchedById.size,
  };

  // Combined match: unique registrants with RE data (email OR constituent ID)
  const matchKeys = statsReg.registrantMatchKeys || [];
  const combinedMatched = matchKeys.filter(
    (r) =>
      (r.email && crmEmails.has(r.email)) || (r.constituentId && crmIds.has(r.constituentId))
  ).length;
  cross.matchedRegistrants = combinedMatched;

  // Gap analysis: AlumniEvent registrants with NO matching Raiser's Edge (email or ID)
  const unmatched = matchKeys.filter(
    (r) =>
      !(r.email && crmEmails.has(r.email)) && !(r.constituentId && crmIds.has(r.constituentId))
  );
  cross.gapAlumniEventOnly = unmatched.reduce((acc, p) => {
    const aff = p.affiliation || 'Other';
    acc[aff] = (acc[aff] || 0) + 1;
    return acc;
  }, {});
  cross.gapAlumniEventOnlyCount = unmatched.length;

  // Gap analysis: Raiser's Edge constituents with NO matching AlumniEvent email
  const unmatchedRE = [...crmEmails].filter((e) => !regEmails.has(e));
  cross.gapRaisersEdgeOnlyCount = unmatchedRE.length;

  // Constituency shifts - normalize both to 5 categories
  const normalizeReg = {};
  Object.entries(statsReg.constituency || {}).forEach(([k, v]) => {
    const lower = k.toLowerCase();
    if (lower.includes('alumni')) {
      normalizeReg['Alumni'] = (normalizeReg['Alumni'] || 0) + v;
    } else if (lower.includes('parent') && !lower.includes('past')) {
      normalizeReg['Parent'] = (normalizeReg['Parent'] || 0) + v;
    } else if (lower.includes('student')) {
      normalizeReg['Student'] = (normalizeReg['Student'] || 0) + v;
    } else if (lower.includes('friend')) {
      normalizeReg['Friend'] = (normalizeReg['Friend'] || 0) + v;
    } else if (lower.includes('faculty') || lower.includes('staff')) {
      normalizeReg['Faculty/Staff'] = (normalizeReg['Faculty/Staff'] || 0) + v;
    } else {
      normalizeReg['Other'] = (normalizeReg['Other'] || 0) + v;
    }
  });

  const normalizeCRM = {};
  Object.entries(statsCRM?.constituency || {}).forEach(([k, v]) => {
    if (k.includes('Alumni')) normalizeCRM['Alumni'] = (normalizeCRM['Alumni'] || 0) + v;
    else if (k === 'Parent') normalizeCRM['Parent'] = v;
    else if (k === 'Student') normalizeCRM['Student'] = v;
    else if (k === 'Friend') normalizeCRM['Friend'] = v;
    else if (k === 'Faculty/Staff') normalizeCRM['Faculty/Staff'] = v;
    else normalizeCRM['Other'] = (normalizeCRM['Other'] || 0) + v;
  });

  cross.constituencyShifts = ['Alumni', 'Parent', 'Student', 'Friend', 'Faculty/Staff'].map(
    (cat) => ({
      label: cat,
      v2024: normalizeCRM[cat] || 0,
      v2025: normalizeReg[cat] || 0,
    })
  );

  // Geography comparison (normalize state names: OH/Ohio, etc.)
  const states2025Lookup = {};
  Object.entries(statsReg.states || {}).forEach(([k, v]) => {
    const norm = normalizeStateForLookup(k) || k;
    const key = norm.toLowerCase();
    states2025Lookup[key] = (states2025Lookup[key] || 0) + v;
  });

  cross.geographyComparison = Object.entries(statsCRM?.states || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([abbr, count]) => {
      const fullName = STATE_MAP[abbr] || abbr;
      const v2025 = states2025Lookup[fullName.toLowerCase()] || 0;
      return { state: abbr, y2024: count, y2025: v2025 };
    });

  // Class decades
  const allDecades = new Set([
    ...Object.keys(statsCRM?.classDecades || {}),
    ...Object.keys(statsReg.classDecades || {}),
  ]);
  cross.classDecades = [...allDecades]
    .sort()
    .map((d) => ({
      decade: d,
      y2024: (statsCRM.classDecades || {})[d] || 0,
      y2025: (statsReg.classDecades || {})[d] || 0,
    }));

  // Wealth vs capacity - map CRM keys to short labels, filter zeros
  const we = statsCRM?.wealthEstimate || {};
  const gc = statsCRM?.giftCapacity || {};
  cross.wealthCapacity = WEALTH_ORDER.map((range, i) => ({
    range: WEALTH_SHORT_LABELS[i],
    we: we[range] || 0,
    gc: gc[range] || 0,
  })).filter((d) => d.we > 0 || d.gc > 0);

  return cross;
}
