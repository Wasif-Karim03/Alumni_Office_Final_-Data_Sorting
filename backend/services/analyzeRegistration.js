/**
 * Process Event Registration export (the "2025" file)
 */
import { toNum, countBy, sortDesc, decadeOf, findCol, findColExact } from '../utils/helpers.js';

const SUB_EVENT_SHORTENINGS = [
  ['2015-2025 Young Alumni - ', 'YA - '],
  [' Reception and Lunch', ''],
  [' and Affinity Huddles', ''],
  [' Induction Ceremony', ''],
  [' and Information Fair', ''],
  [' Sisterhood event and Open House', ' Sisterhood'],
  [' Sisterhood event', ' Sisterhood'],
  [' Service Project', ' Service'],
  [' Saturday Program', ''],
  [' - Invite Only', ''],
  ['Battling Bishops Tailgate', 'Tailgate & Huddles'],
  [' Meet and Reception', ''],
  ["Women's Volleyball game and Celebration of '94 and '96 teams", 'Volleyball Reunion'],
  [
    'David Hamilton Smith Sorority & Fraternity Reception and Awards',
    'Sorority & Frat Awards',
  ],
  [' Reception at the Ross Art Museum', ' @ Ross'],
];

const DIETARY_NO_VALS = new Set(['no', 'none', 'n/a', 'na', 'na/a', 'nope', 'no.', '']);

function getSubEventCategory(colName) {
  const colLower = colName.toLowerCase();
  if (
    /kappa|delta|phi|sigma|alpha|sorority|fraternity|greek/.test(colLower) ||
    (colLower.includes('delta') && colLower.includes('gamma'))
  )
    return 'Greek';
  if (
    /swim|soccer|volleyball|captain|hall of fame|"w"|association/.test(colLower)
  )
    return 'Athletics';
  if (/pints|observatory|performing|prof/.test(colLower)) return 'Academic';
  if (/family|mixer/.test(colLower)) return 'Family';
  if (/invite/.test(colLower)) return 'Invite-Only';
  return 'General';
}

function shortenEventName(colName) {
  let shortName = colName;
  if (shortName.length > 35) {
    for (const [from, to] of SUB_EVENT_SHORTENINGS) {
      shortName = shortName.replace(from, to);
    }
    if (shortName.length > 40) shortName = shortName.substring(0, 37) + '...';
  }
  return shortName;
}

export function analyzeRegistration(rows) {
  const stats = {};
  const firstRow = rows[0] || {};

  stats.total = rows.length;

  // Registration basics
  stats.uniqueRegistrations = new Set(
    rows.map((r) => r['Registration ID']).filter(Boolean)
  ).size;
  stats.primaryGuests = rows.filter((r) => r['Guest Type'] === 'Primary Guest').length;
  stats.accompanyingGuests = rows.filter(
    (r) => r['Guest Type'] === 'Accompanying Guest'
  ).length;

  // Status
  const statuses = countBy(rows, (r) => r['Registration Status']);
  stats.successful = statuses['Registration Successful'] || 0;
  stats.pending = statuses['Pending Payment'] || 0;
  stats.cancelled = statuses['Registration Cancelled'] || 0;

  // RSVP
  stats.rsvpYes = rows.filter((r) => r['RSVP'] === 'Yes').length;
  stats.rsvpNo = rows.filter((r) => r['RSVP'] === 'No').length;

  // First-timers
  const firstTimeCol = findCol(firstRow, 'first time');
  if (firstTimeCol) {
    stats.firstTimers = rows.filter((r) => r[firstTimeCol] === 'Yes').length;
    stats.returning = rows.filter((r) => r[firstTimeCol] === 'No').length;
  } else {
    stats.firstTimers = 0;
    stats.returning = 0;
  }

  // Affiliations
  const affCol = findCol(firstRow, 'Affiliations');
  stats.constituency = affCol ? countBy(rows.filter((r) => r[affCol]), (r) => r[affCol]) : {};

  // Total Alumni: anyone who selected Alumni (alone or with other options like Parent, Trustee)
  stats.totalAlumni = affCol
    ? rows.filter((r) => {
        const aff = String(r[affCol] || '').toLowerCase();
        return aff.includes('alumni');
      }).length
    : 0;

  // Class years
  const cyCol = findCol(firstRow, 'Class Year, N/A');
  const classYears = cyCol
    ? rows
        .map((r) => toNum(r[cyCol]))
        .filter((y) => y && y > 1940 && y < 2035)
    : [];
  stats.classYearCounts = countBy(classYears.map(String), (v) => v);
  stats.classDecades = countBy(classYears, decadeOf);
  stats.classYearTop = sortDesc(stats.classYearCounts).slice(0, 15);

  // Geography - use LAST occurrence of "State"
  const stateCol = findColExact(firstRow, 'State');
  if (stateCol) {
    stats.states = countBy(rows.filter((r) => r[stateCol]), (r) => r[stateCol]);
    stats.uniqueStates = Object.keys(stats.states).length;
    const totalStateCount = Object.values(stats.states).reduce((a, b) => a + b, 0);
    const ohioKey = Object.keys(stats.states).find((k) => k.toLowerCase().includes('ohio')) || '';
    stats.ohioCount = ohioKey ? stats.states[ohioKey] : 0;
    stats.ohioPct =
      totalStateCount > 0
        ? Math.round((stats.ohioCount / totalStateCount) * 1000) / 10
        : 0;
  } else {
    stats.states = {};
    stats.uniqueStates = 0;
    stats.ohioCount = 0;
    stats.ohioPct = 0;
  }

  // Sub-Events
  stats.subEvents = [];
  Object.keys(firstRow).forEach((col) => {
    const vals = rows.map((r) => r[col]).filter(Boolean);
    const attending = vals.filter((v) => v === 'Attending').length;
    const notAttending = vals.filter((v) => v === 'Not Attending').length;
    if (attending + notAttending > rows.length * 0.5 && attending > 0) {
      const cat = getSubEventCategory(col);
      const shortName = shortenEventName(col);
      stats.subEvents.push({
        name: shortName,
        fullName: col,
        count: attending,
        cat,
      });
    }
  });
  stats.subEvents.sort((a, b) => b.count - a.count);

  // Registration timeline
  const dateCol = 'Registration Date Time';
  const months = {};
  const monthNames = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  rows.forEach((r) => {
    const d = r[dateCol];
    if (!d) return;
    const match = String(d).match(/^(\d{4})-(\d{2})/);
    if (match) {
      const key = `${monthNames[parseInt(match[2])]} ${match[1]}`;
      months[key] = (months[key] || 0) + 1;
    }
  });
  stats.registrationMonths = months;

  // Discount codes
  const discCol = findCol(firstRow, 'Discount Code');
  stats.discountCodes =
    discCol
      ? countBy(
          rows.filter((r) => r[discCol] && r[discCol] !== 'Discount Code Applied'),
          (r) => r[discCol]
        )
      : {};

  // Dietary
  const dietCol = findCol(firstRow, 'dietary');
  if (dietCol) {
    stats.dietaryCount = rows.filter(
      (r) => r[dietCol] && !DIETARY_NO_VALS.has(r[dietCol].toLowerCase().trim())
    ).length;
  } else {
    stats.dietaryCount = 0;
  }

  // Check-in
  stats.checkedIn = rows.filter((r) => r['Check-In'] === 'Yes').length;

  // Names for retention (internal use only - stripped before JSON response)
  const nameCol = findCol(firstRow, 'Guest Full Name') || 'Guest Full Name';
  stats.names = new Set(
    rows.map((r) => (r[nameCol] || '').trim().toLowerCase()).filter(Boolean)
  );

  // Emails for cross-system matching (AlumniEvent: Guest Email)
  const emailCol = findCol(firstRow, 'Guest Email') || findCol(firstRow, 'Email') || 'Guest Email';
  stats.emails = new Set(
    rows
      .map((r) => (r[emailCol] || '').trim().toLowerCase())
      .filter((e) => e && e.includes('@'))
  );

  // Constituent IDs for cross-system matching (AlumniEvent: Constituent Id)
  const constIdCol = findCol(firstRow, 'Constituent Id') || findCol(firstRow, 'Constituent ID') || 'Constituent Id';
  stats.constituentIds = new Set(
    rows
      .map((r) => String(r[constIdCol] || '').trim())
      .filter(Boolean)
  );

  // Email + affiliation pairs for gap analysis (unmatched registrants)
  stats.emailAffiliationPairs = rows
    .map((r) => {
      const email = (r[emailCol] || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return null;
      const aff = (affCol ? r[affCol] : '') || 'Other';
      return { email, affiliation: aff };
    })
    .filter(Boolean);

  // Per-row match keys for combined email+ID matching and gap analysis (used in crossAnalysis, stripped before response)
  stats.registrantMatchKeys = rows.map((r) => ({
    email: (r[emailCol] || '').trim().toLowerCase(),
    constituentId: String(r[constIdCol] || '').trim(),
    affiliation: (affCol ? r[affCol] : '') || 'Other',
  }));

  return stats;
}
