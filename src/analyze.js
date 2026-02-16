/**
 * OWU Alumni Analytics — Data Analysis Engine
 * 
 * Takes raw parsed CSV data from both years and produces
 * a comprehensive analytics object for the dashboard.
 */

// ─── Helpers ───────────────────────────────────────────────

const countBy = (arr, fn) => {
  const map = {};
  arr.forEach(item => {
    const key = fn(item);
    if (key != null && key !== '') map[key] = (map[key] || 0) + 1;
  });
  return map;
};

const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

const toNum = (val) => {
  if (val == null || val === '') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : Number(val);
  return isNaN(n) ? null : n;
};

const sumCol = (rows, key) => rows.reduce((s, r) => s + (toNum(r[key]) || 0), 0);

const decadeOf = (year) => {
  const y = Math.floor(year / 10) * 10;
  return `${y}s`;
};


// ─── 2024 Processor ────────────────────────────────────────

function process2024(rows) {
  const stats = {};

  // Basic counts
  stats.total = rows.length;

  // Constituency
  stats.constituency = countBy(rows, r => r['Constituency Code']);

  // Class years
  const classYears = rows.map(r => toNum(r['CL YR'])).filter(y => y && y > 1940 && y < 2035);
  stats.classYearCounts = countBy(classYears.map(String), v => v);
  stats.classDecades = countBy(classYears, decadeOf);
  stats.classYearTop = sortDesc(stats.classYearCounts).slice(0, 15);

  // Geography
  stats.states = countBy(rows, r => r['State']);
  stats.uniqueStates = Object.keys(stats.states).length;
  const ohioKey = Object.keys(stats.states).find(k => k === 'OH' || k === 'Ohio') || 'OH';
  stats.ohioCount = stats.states[ohioKey] || 0;
  stats.ohioPct = stats.total > 0 ? Math.round(stats.ohioCount / stats.total * 1000) / 10 : 0;

  // Greek
  const greekRows = rows.filter(r => r['Greek Affiliation'] && r['Greek Affiliation'].trim() !== '');
  stats.greekTotal = greekRows.length;
  stats.greekNone = stats.total - stats.greekTotal;
  stats.greek = countBy(greekRows, r => r['Greek Affiliation']);

  // Majors
  stats.majors = countBy(rows.filter(r => r['Major'] && r['Major'] !== 'MAUNDE'), r => r['Major']);

  // Giving
  const ltGiving = rows.map(r => toNum(r['LT Giving'])).filter(v => v !== null);
  const lastGiftAmt = rows.map(r => toNum(r['Last Gift Amount'])).filter(v => v !== null && v > 0);
  stats.giving = {
    lifetimeTotal: ltGiving.reduce((a, b) => a + b, 0),
    lifetimeMean: ltGiving.length > 0 ? ltGiving.reduce((a, b) => a + b, 0) / ltGiving.length : 0,
    lifetimeMedian: median(ltGiving),
    lifetimeMax: Math.max(...ltGiving, 0),
    lastGiftMean: lastGiftAmt.length > 0 ? lastGiftAmt.reduce((a, b) => a + b, 0) / lastGiftAmt.length : 0,
    lastGiftMedian: median(lastGiftAmt),
    donorsCount: lastGiftAmt.length,
    nonDonors: stats.total - lastGiftAmt.length,
    tiers: {
      '$0': ltGiving.filter(v => v === 0).length,
      '$1-99': ltGiving.filter(v => v > 0 && v < 100).length,
      '$100-999': ltGiving.filter(v => v >= 100 && v < 1000).length,
      '$1K-9.9K': ltGiving.filter(v => v >= 1000 && v < 10000).length,
      '$10K-99K': ltGiving.filter(v => v >= 10000 && v < 100000).length,
      '$100K+': ltGiving.filter(v => v >= 100000).length,
    }
  };

  // FY Annual Fund
  const afCols = ['AF14 - Gifts', 'AF15 - Gifts', 'AF16 - Gifts', 'AF17 - Gifts', 'AF18 - Gifts', 'AF19 - Gifts'];
  const afLabels = ['FY14', 'FY15', 'FY16', 'FY17', 'FY18', 'FY19'];
  stats.fyGiving = afLabels.map((label, i) => ({
    year: label,
    amount: Math.round(sumCol(rows, afCols[i]))
  }));

  // Wealth & Capacity
  stats.wealthEstimate = countBy(rows.filter(r => r['WE Range']), r => r['WE Range']);
  stats.giftCapacity = countBy(rows.filter(r => r['Internal Gift Capacity']), r => r['Internal Gift Capacity']);

  // Engagement score
  const engScores = rows.map(r => toNum(r['Eng Score'])).filter(v => v !== null);
  stats.engScoreMean = engScores.length > 0 ? Math.round(engScores.reduce((a, b) => a + b, 0) / engScores.length * 10) / 10 : 0;
  stats.engScoreMedian = median(engScores);

  // Employment
  stats.employers = countBy(rows.filter(r => r['CnPrBs_Org_Name']), r => r['CnPrBs_Org_Name']);
  stats.positions = countBy(rows.filter(r => r['CnPrBs_Position']), r => r['CnPrBs_Position']);

  // Spouse
  stats.spouseCount = rows.filter(r => r['SP Name'] && r['SP Name'].trim() !== '').length;
  stats.spouseAlumni = rows.filter(r => r['SP CL YR'] && String(r['SP CL YR']).trim() !== '').length;

  // Names for retention matching
  stats.names = new Set(rows.map(r => (r['Name'] || '').trim().toLowerCase()).filter(Boolean));

  return stats;
}


// ─── 2025 Processor ────────────────────────────────────────

function process2025(rows) {
  const stats = {};

  // The 2025 file has a category header row followed by column header row
  // We need to detect actual headers — find the row that has "Registration ID"
  // Papa Parse should handle this if we skip the first row or detect headers

  stats.total = rows.length;

  // Registration basics
  stats.uniqueRegistrations = new Set(rows.map(r => r['Registration ID']).filter(Boolean)).size;
  stats.primaryGuests = rows.filter(r => r['Guest Type'] === 'Primary Guest').length;
  stats.accompanyingGuests = rows.filter(r => r['Guest Type'] === 'Accompanying Guest').length;

  // Status
  const statuses = countBy(rows, r => r['Registration Status']);
  stats.successful = statuses['Registration Successful'] || 0;
  stats.pending = statuses['Pending Payment'] || 0;
  stats.cancelled = statuses['Registration Cancelled'] || 0;

  // RSVP
  stats.rsvpYes = rows.filter(r => r['RSVP'] === 'Yes').length;
  stats.rsvpNo = rows.filter(r => r['RSVP'] === 'No').length;

  // First-timer (column: "Is this your first time you have attended an OWU sponsored event?")
  const firstTimeCol = findCol(rows[0], 'first time');
  if (firstTimeCol) {
    stats.firstTimers = rows.filter(r => r[firstTimeCol] === 'Yes').length;
    stats.returning = rows.filter(r => r[firstTimeCol] === 'No').length;
  } else {
    stats.firstTimers = 0;
    stats.returning = 0;
  }

  // Affiliations
  const affCol = findCol(rows[0], 'Affiliations');
  stats.constituency = affCol ? countBy(rows.filter(r => r[affCol]), r => r[affCol]) : {};

  // Class Year (guest form)
  const cyCol = findCol(rows[0], 'Class Year, N/A');
  const classYears = cyCol
    ? rows.map(r => toNum(r[cyCol])).filter(y => y && y > 1940 && y < 2035)
    : [];
  stats.classYearCounts = countBy(classYears.map(String), v => v);
  stats.classDecades = countBy(classYears, decadeOf);
  stats.classYearTop = sortDesc(stats.classYearCounts).slice(0, 15);

  // Geography
  const stateCol = findColExact(rows[0], 'State');
  if (stateCol) {
    stats.states = countBy(rows.filter(r => r[stateCol]), r => r[stateCol]);
    stats.uniqueStates = Object.keys(stats.states).length;
    const ohioKey = Object.keys(stats.states).find(k => k.toLowerCase().includes('ohio')) || '';
    stats.ohioCount = ohioKey ? stats.states[ohioKey] : 0;
    stats.ohioPct = stats.total > 0 ? Math.round(stats.ohioCount / Object.values(stats.states).reduce((a, b) => a + b, 0) * 1000) / 10 : 0;
  } else {
    stats.states = {};
    stats.uniqueStates = 0;
    stats.ohioPct = 0;
  }

  // Sub-Events — detect all columns that have "Attending" / "Not Attending" values
  stats.subEvents = [];
  const sampleRow = rows[0] || {};
  Object.keys(sampleRow).forEach(col => {
    const vals = rows.map(r => r[col]).filter(Boolean);
    const attending = vals.filter(v => v === 'Attending').length;
    const notAttending = vals.filter(v => v === 'Not Attending').length;
    if (attending + notAttending > rows.length * 0.5 && attending > 0) {
      // Categorize the event
      let cat = 'General';
      const colLower = col.toLowerCase();
      if (colLower.includes('kappa') || colLower.includes('delta') || colLower.includes('phi') || colLower.includes('sigma') || colLower.includes('alpha') || colLower.includes('sorority') || colLower.includes('fraternity') || colLower.includes('greek')) cat = 'Greek';
      else if (colLower.includes('swim') || colLower.includes('soccer') || colLower.includes('volleyball') || colLower.includes('captain') || colLower.includes('hall of fame') || colLower.includes('"w"') || colLower.includes('association')) cat = 'Athletics';
      else if (colLower.includes('pints') || colLower.includes('observatory') || colLower.includes('performing') || colLower.includes('prof')) cat = 'Academic';
      else if (colLower.includes('family') || colLower.includes('mixer')) cat = 'Family';
      else if (colLower.includes('invite')) cat = 'Invite-Only';

      // Shorten the name for display
      let shortName = col;
      if (shortName.length > 35) {
        shortName = shortName
          .replace('2015-2025 Young Alumni - ', 'YA - ')
          .replace(' Reception and Lunch', '')
          .replace(' and Affinity Huddles', '')
          .replace(' Induction Ceremony', '')
          .replace(' and Information Fair', '')
          .replace(' Sisterhood event and Open House', ' Sisterhood')
          .replace(' Sisterhood event', ' Sisterhood')
          .replace(' Service Project', ' Service')
          .replace(' Saturday Program', '')
          .replace(' - Invite Only', '')
          .replace('Battling Bishops Tailgate', 'Tailgate & Huddles')
          .replace(' Meet and Reception', '')
          .replace("Women's Volleyball game and Celebration of '94 and '96 teams", 'Volleyball Reunion')
          .replace('David Hamilton Smith Sorority & Fraternity Reception and Awards', 'Sorority & Frat Awards')
          .replace(' Reception at the Ross Art Museum', ' @ Ross');
        if (shortName.length > 40) shortName = shortName.substring(0, 37) + '...';
      }

      stats.subEvents.push({ name: shortName, fullName: col, count: attending, cat });
    }
  });
  stats.subEvents.sort((a, b) => b.count - a.count);

  // Registration timeline
  const dateCol = 'Registration Date Time';
  const months = {};
  rows.forEach(r => {
    const d = r[dateCol];
    if (!d) return;
    const match = String(d).match(/^(\d{4})-(\d{2})/);
    if (match) {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const key = `${monthNames[parseInt(match[2])]} ${match[1]}`;
      months[key] = (months[key] || 0) + 1;
    }
  });
  stats.registrationMonths = months;

  // Discount codes
  const discCol = findCol(rows[0], 'Discount Code');
  stats.discountCodes = discCol ? countBy(rows.filter(r => r[discCol] && r[discCol] !== 'Discount Code Applied'), r => r[discCol]) : {};

  // Dietary needs
  const dietCol = findCol(rows[0], 'dietary');
  if (dietCol) {
    const noVals = new Set(['no', 'none', 'n/a', 'na', 'na/a', 'nope', 'no.', '']);
    stats.dietaryCount = rows.filter(r => r[dietCol] && !noVals.has(r[dietCol].toLowerCase().trim())).length;
  } else {
    stats.dietaryCount = 0;
  }

  // Check-in
  stats.checkedIn = rows.filter(r => r['Check-In'] === 'Yes').length;

  // Names for retention
  const nameCol = findCol(rows[0], 'Guest Full Name');
  stats.names = new Set(rows.map(r => (r[nameCol || 'Guest Full Name'] || '').trim().toLowerCase()).filter(Boolean));

  return stats;
}


// ─── Retention & Cross-Analysis ────────────────────────────

function crossAnalyze(stats2024, stats2025) {
  const cross = {};

  // Name-based retention
  const both = new Set([...stats2024.names].filter(n => stats2025.names.has(n)));
  cross.retention = {
    both: both.size,
    only2024: stats2024.names.size - both.size,
    only2025: stats2025.names.size - both.size,
  };

  // Constituency shifts
  const normalize2025 = {};
  Object.entries(stats2025.constituency).forEach(([k, v]) => {
    if (k.toLowerCase().includes('alumni')) {
      normalize2025['Alumni'] = (normalize2025['Alumni'] || 0) + v;
    } else if (k.toLowerCase().includes('parent') && !k.toLowerCase().includes('past')) {
      normalize2025['Parent'] = (normalize2025['Parent'] || 0) + v;
    } else if (k.toLowerCase().includes('student')) {
      normalize2025['Student'] = (normalize2025['Student'] || 0) + v;
    } else if (k.toLowerCase().includes('friend')) {
      normalize2025['Friend'] = (normalize2025['Friend'] || 0) + v;
    } else if (k.toLowerCase().includes('faculty') || k.toLowerCase().includes('staff')) {
      normalize2025['Faculty/Staff'] = (normalize2025['Faculty/Staff'] || 0) + v;
    } else {
      normalize2025['Other'] = (normalize2025['Other'] || 0) + v;
    }
  });

  const normalize2024 = {};
  Object.entries(stats2024.constituency).forEach(([k, v]) => {
    if (k.includes('Alumni')) normalize2024['Alumni'] = (normalize2024['Alumni'] || 0) + v;
    else if (k === 'Parent') normalize2024['Parent'] = v;
    else if (k === 'Student') normalize2024['Student'] = v;
    else if (k === 'Friend') normalize2024['Friend'] = v;
    else if (k === 'Faculty/Staff') normalize2024['Faculty/Staff'] = v;
    else normalize2024['Other'] = (normalize2024['Other'] || 0) + v;
  });

  cross.constituencyShifts = ['Alumni', 'Parent', 'Student', 'Friend', 'Faculty/Staff'].map(cat => ({
    label: cat,
    v2024: normalize2024[cat] || 0,
    v2025: normalize2025[cat] || 0,
  }));

  // Geography comparison — normalize state names
  const stateMap = {
    'OH': 'Ohio', 'NY': 'New York', 'PA': 'Pennsylvania', 'IL': 'Illinois',
    'MI': 'Michigan', 'CT': 'Connecticut', 'IN': 'Indiana', 'TX': 'Texas',
    'CA': 'California', 'FL': 'Florida', 'CO': 'Colorado', 'MA': 'Massachusetts',
    'MD': 'Maryland', 'VT': 'Vermont', 'TN': 'Tennessee', 'KY': 'Kentucky'
  };
  const allStates = new Set();
  Object.keys(stats2024.states).forEach(s => allStates.add(s));
  Object.keys(stats2025.states).forEach(s => allStates.add(s));

  // Build lookup for 2025 (full names)
  const states2025Lookup = {};
  Object.entries(stats2025.states).forEach(([k, v]) => { states2025Lookup[k.toLowerCase()] = v; });

  cross.geographyComparison = [];
  const seen = new Set();
  Object.entries(stats2024.states).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([abbr, count]) => {
    const fullName = stateMap[abbr] || abbr;
    const v2025 = states2025Lookup[fullName.toLowerCase()] || 0;
    cross.geographyComparison.push({ state: abbr, y2024: count, y2025: v2025 });
    seen.add(fullName.toLowerCase());
  });

  // Decade comparison
  const allDecades = new Set([...Object.keys(stats2024.classDecades), ...Object.keys(stats2025.classDecades)]);
  cross.classDecades = [...allDecades].sort().map(d => ({
    decade: d,
    y2024: stats2024.classDecades[d] || 0,
    y2025: stats2025.classDecades[d] || 0,
  }));

  // Wealth vs capacity chart
  const wealthOrder = [
    '$1-$2,499', '$2,500-$4,999', '$5,000-$9,999', '$10,000-$14,999',
    '$15,000-$24,999', '$25,000-$49,999', '$50,000-$99,999', '$100,000-$249,999',
    '$250,000-$499,999', '$500,000-$999,999', '$1,000,000-$4,999,999', '$5,000,000+'
  ];
  const shortLabels = ['$1-2.5K', '$2.5-5K', '$5-10K', '$10-15K', '$15-25K', '$25-50K', '$50-100K', '$100-250K', '$250-500K', '$500K-1M', '$1-5M', '$5M+'];
  cross.wealthCapacity = wealthOrder.map((range, i) => ({
    range: shortLabels[i],
    we: stats2024.wealthEstimate[range] || 0,
    gc: stats2024.giftCapacity[range] || 0,
  }));

  return cross;
}


// ─── Generate Insights ─────────────────────────────────────

function generateInsights(stats2024, stats2025, cross) {
  const insights = [];

  // 1. Constituency shift
  const alumniShift = cross.constituencyShifts.find(s => s.label === 'Alumni');
  const parentShift = cross.constituencyShifts.find(s => s.label === 'Parent');
  if (alumniShift && parentShift && alumniShift.v2025 < alumniShift.v2024) {
    const alumniPct = Math.round((alumniShift.v2025 - alumniShift.v2024) / alumniShift.v2024 * 100);
    const parentPct = Math.round((parentShift.v2025 - parentShift.v2024) / parentShift.v2024 * 100);
    insights.push({
      icon: '📈', title: 'Parents Are Growing, Alumni Are Declining',
      body: `Parents ${parentPct > 0 ? 'grew' : 'changed'} by ${parentPct}% (${parentShift.v2024} → ${parentShift.v2025}) while alumni ${alumniPct < 0 ? 'dropped' : 'changed'} by ${alumniPct}% (${alumniShift.v2024} → ${alumniShift.v2025}). Consider whether alumni events are compelling enough and if outreach is reaching the right segments.`,
      priority: 'High', color: '#e05252'
    });
  }

  // 2. Friends growth
  const friendShift = cross.constituencyShifts.find(s => s.label === 'Friend');
  if (friendShift && friendShift.v2025 > friendShift.v2024 * 1.5) {
    insights.push({
      icon: '🌟', title: `Friends Segment Grew Significantly`,
      body: `The "Friend" category went from ${friendShift.v2024} to ${friendShift.v2025} — a ${Math.round((friendShift.v2025 - friendShift.v2024) / friendShift.v2024 * 100)}% increase. Worth investigating who these friends are and whether they can be converted to donors.`,
      priority: 'Medium', color: '#fb923c'
    });
  }

  // 3. Non-donors at events
  if (stats2024.giving) {
    const nonDonorPct = Math.round(stats2024.giving.nonDonors / stats2024.total * 100);
    if (nonDonorPct > 30) {
      insights.push({
        icon: '💰', title: `${nonDonorPct}% of Event Attendees Have Never Given`,
        body: `${stats2024.giving.nonDonors} of ${stats2024.total} registrants have $0 lifetime giving. These are engaged enough to attend but haven't been converted. Cross-reference with wealth estimates — some have significant capacity. This is your highest-ROI cultivation list.`,
        priority: 'High', color: '#e05252'
      });
    }
  }

  // 4. Strong class years
  if (stats2024.classYearTop.length > 0 && stats2025.classYearTop.length > 0) {
    const top2024 = stats2024.classYearTop.filter(([y]) => parseInt(y) < 2020);
    const top2025 = stats2025.classYearTop.filter(([y]) => parseInt(y) < 2020);
    const commonStrong = top2024.filter(([y]) => top2025.some(([y2]) => y === y2));
    if (commonStrong.length > 0) {
      const ex = commonStrong[0];
      insights.push({
        icon: '🎓', title: `Class of ${ex[0]} Is Consistently Strong`,
        body: `The class of '${ex[0].slice(2)} showed strong attendance both years. This cohort should be cultivated for major gifts and legacy planning.`,
        priority: 'Medium', color: '#fb923c'
      });
    }
  }

  // 5. Greek life
  if (stats2024.greekTotal > stats2024.total * 0.3) {
    insights.push({
      icon: '🏛️', title: 'Greek Life Drives Significant Attendance',
      body: `${Math.round(stats2024.greekTotal / stats2024.total * 100)}% of registrants had Greek affiliations (${stats2024.greekTotal} of ${stats2024.total}). Greek reunion programming is a proven attendance driver.`,
      priority: 'Low', color: '#4ade80'
    });
  }

  // 6. Top events
  if (stats2025.subEvents.length > 0) {
    const top = stats2025.subEvents[0];
    insights.push({
      icon: '🎪', title: `${top.name} Is the Anchor Event`,
      body: `With ${top.count} attendees, it far outpaces other events. Most niche events draw 10-40 people. Plan capacity and budget around these anchor events.`,
      priority: 'Medium', color: '#fb923c'
    });
  }

  // 7. Annual Fund growth
  if (stats2024.fyGiving && stats2024.fyGiving.length >= 2) {
    const first = stats2024.fyGiving[0].amount;
    const last = stats2024.fyGiving[stats2024.fyGiving.length - 1].amount;
    if (first > 0 && last > first) {
      const growth = Math.round((last - first) / first * 100);
      insights.push({
        icon: '📊', title: `Annual Fund Giving Grew ${growth}% Among Attendees`,
        body: `Annual Fund giving from event attendees grew from $${(first / 1000).toFixed(0)}K to $${(last / 1000).toFixed(0)}K over the tracked period. Events correlate with giving growth.`,
        priority: 'High', color: '#e05252'
      });
    }
  }

  // 8. Geographic concentration
  if (stats2024.ohioPct > 60 || stats2025.ohioPct > 60) {
    insights.push({
      icon: '🗺️', title: `~${Math.round((stats2024.ohioPct + stats2025.ohioPct) / 2)}% Ohio — Geographic Expansion Opportunity`,
      body: `Ohio accounts for the vast majority of registrants both years. The remaining attendees span ${Math.max(stats2024.uniqueStates, stats2025.uniqueStates)}+ states but with tiny numbers. Consider regional pre-event meetups or travel stipends.`,
      priority: 'Low', color: '#4ade80'
    });
  }

  // 9. Data mismatch note
  insights.push({
    icon: '⚠️', title: 'Data Platform Mismatch Limits Analysis',
    body: 'The two files use different platforms and schemas. The earlier file is a CRM/advancement export with giving data but no event details. The later file is an event registration export with rich event data but no giving history. Unifying via constituent ID would unlock more powerful analysis.',
    priority: 'High', color: '#e05252'
  });

  // 10. Retention
  if (cross.retention.both < Math.min(stats2024.names.size, stats2025.names.size) * 0.1) {
    insights.push({
      icon: '🔄', title: `Low Year-over-Year Retention (${cross.retention.both} matched)`,
      body: `Only ${cross.retention.both} names matched across both years out of ${stats2024.names.size} (earlier year) and ${stats2025.names.size} (later year). This may partly reflect name formatting differences between platforms. True retention would require ID-based matching.`,
      priority: 'Medium', color: '#fb923c'
    });
  }

  return insights;
}


// ─── Utility ───────────────────────────────────────────────

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findCol(row, partial) {
  if (!row) return null;
  const lower = partial.toLowerCase();
  return Object.keys(row).find(k => k.toLowerCase().includes(lower)) || null;
}

function findColExact(row, name) {
  if (!row) return null;
  // Find the LAST column named this (profile data State, not some other State-like col)
  const matches = Object.keys(row).filter(k => k === name);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}


// ─── Main Export ───────────────────────────────────────────

export function analyzeData(rows2024, rows2025) {
  const stats2024 = process2024(rows2024);
  const stats2025 = process2025(rows2025);
  const cross = crossAnalyze(stats2024, stats2025);
  const insights = generateInsights(stats2024, stats2025, cross);

  return { stats2024, stats2025, cross, insights };
}
