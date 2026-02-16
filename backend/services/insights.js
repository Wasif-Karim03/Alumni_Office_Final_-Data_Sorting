/**
 * Auto-generate strategic insights from analytics data
 */
export function generateInsights(statsCRM, statsReg, cross) {
  const insights = [];
  const hasRE = statsCRM && statsCRM.total > 0;

  if (!hasRE) {
    insights.push({
      icon: '📋',
      title: 'AlumniEvent Data Only',
      body: 'Raiser\'s Edge was not uploaded. Giving, Greek affiliation, majors, and wealth data are unavailable. Upload an RE constituent export to enable full analysis.',
      priority: 'High',
      color: '#fb923c',
    });
    // Registration-only insights
    if (statsReg.subEvents && statsReg.subEvents.length > 0) {
      const top = statsReg.subEvents[0];
      insights.push({
        icon: '🎪',
        title: `${top.name} Is the Top Event`,
        body: `With ${top.count} attendees. Plan capacity around anchor events.`,
        priority: 'Medium',
        color: '#fb923c',
      });
    }
    if (statsReg.ohioPct > 60) {
      insights.push({
        icon: '🗺️',
        title: `~${Math.round(statsReg.ohioPct)}% from Ohio`,
        body: 'Geographic concentration in Ohio. Consider regional outreach for expansion.',
        priority: 'Low',
        color: '#4ade80',
      });
    }
    return insights;
  }

  // 1. Constituency: RE vs Registration comparison
  const alumniShift = cross.constituencyShifts.find((s) => s.label === 'Alumni');
  const parentShift = cross.constituencyShifts.find((s) => s.label === 'Parent');
  if (alumniShift && parentShift && alumniShift.v2025 < alumniShift.v2024) {
    insights.push({
      icon: '📈',
      title: 'Parents Outnumber Alumni in Registration',
      body: `Raiser's Edge has ${alumniShift.v2024} alumni vs ${parentShift.v2024} parents. In registration: ${alumniShift.v2025} alumni vs ${parentShift.v2025} parents. Parents may be over-represented in registration — consider alumni-specific outreach.`,
      priority: 'High',
      color: '#e05252',
    });
  }

  // 2. Friends segment
  const friendShift = cross.constituencyShifts.find((s) => s.label === 'Friend');
  if (friendShift && friendShift.v2025 > friendShift.v2024 && friendShift.v2024 > 0) {
    insights.push({
      icon: '🌟',
      title: 'Friends Segment Notable in Registration',
      body: `"Friend" category: ${friendShift.v2024} in Raiser's Edge, ${friendShift.v2025} in registration. Worth investigating who these friends are and whether they can be converted to donors.`,
      priority: 'Medium',
      color: '#fb923c',
    });
  }

  // 3. Non-donors
  if (statsCRM.giving && statsCRM.total > 0) {
    const nonDonorPct = Math.round((statsCRM.giving.nonDonors / statsCRM.total) * 100);
    if (nonDonorPct > 30) {
      insights.push({
        icon: '💰',
        title: `${nonDonorPct}% of Event Attendees Have Never Given`,
        body: `${statsCRM.giving.nonDonors} of ${statsCRM.total} registrants have $0 lifetime giving. These are engaged enough to attend but haven't been converted. Cross-reference with wealth estimates — some have significant capacity. This is your highest-ROI cultivation list.`,
        priority: 'High',
        color: '#e05252',
      });
    }
  }

  // 4. Strong class years (appear in both RE and Registration)
  const topCRM = (statsCRM.classYearTop || []).filter(([y]) => parseInt(y) < 2020);
  const topReg = (statsReg.classYearTop || []).filter(([y]) => parseInt(y) < 2020);
  const commonStrong = topCRM.filter(([y]) => topReg.some(([y2]) => y === y2));
  if (commonStrong.length > 0) {
    const ex = commonStrong[0];
    insights.push({
      icon: '🎓',
      title: `Class of ${ex[0]} Shows Strong Representation`,
      body: `The class of '${ex[0].slice(2)} appears in both Raiser's Edge and registration data. This cohort should be cultivated for major gifts and legacy planning.`,
      priority: 'Medium',
      color: '#fb923c',
    });
  }

  // 5. Greek life
  if (statsCRM.greekTotal > statsCRM.total * 0.3) {
    insights.push({
      icon: '🏛️',
      title: 'Greek Life Drives Significant Attendance',
      body: `${Math.round((statsCRM.greekTotal / statsCRM.total) * 100)}% of registrants had Greek affiliations (${statsCRM.greekTotal} of ${statsCRM.total}). Greek reunion programming is a proven attendance driver.`,
      priority: 'Low',
      color: '#4ade80',
    });
  }

  // 6. Top event
  if (statsReg.subEvents && statsReg.subEvents.length > 0) {
    const top = statsReg.subEvents[0];
    insights.push({
      icon: '🎪',
      title: `${top.name} Is the Anchor Event`,
      body: `With ${top.count} attendees, it far outpaces other events. Most niche events draw 10-40 people. Plan capacity and budget around these anchor events.`,
      priority: 'Medium',
      color: '#fb923c',
    });
  }

  // 7. Annual Fund growth
  if (statsCRM.fyGiving && statsCRM.fyGiving.length >= 2) {
    const first = statsCRM.fyGiving[0].amount;
    const last = statsCRM.fyGiving[statsCRM.fyGiving.length - 1].amount;
    if (first > 0 && last > first) {
      const growth = Math.round(((last - first) / first) * 100);
      insights.push({
        icon: '📊',
        title: `Annual Fund Giving Grew ${growth}% Among Attendees`,
        body: `Annual Fund giving from event attendees grew from $${(first / 1000).toFixed(0)}K to $${(last / 1000).toFixed(0)}K over the tracked period. Events correlate with giving growth.`,
        priority: 'High',
        color: '#e05252',
      });
    }
  }

  // 8. Geographic concentration
  if (statsCRM.ohioPct > 60 || statsReg.ohioPct > 60) {
    insights.push({
      icon: '🗺️',
      title: `~${Math.round((statsCRM.ohioPct + statsReg.ohioPct) / 2)}% Ohio — Geographic Expansion Opportunity`,
      body: `Ohio accounts for the vast majority of attendees. The remaining span ${Math.max(statsCRM.uniqueStates || 0, statsReg.uniqueStates || 0)}+ states. Consider regional pre-event meetups or travel stipends.`,
      priority: 'Low',
      color: '#4ade80',
    });
  }

  // 9. Cross-system match quality
  if (cross.matchByEmail && cross.gapAlumniEventOnlyCount > 0) {
    const matchPct =
      statsReg.total > 0
        ? Math.round(((statsReg.total - cross.gapAlumniEventOnlyCount) / statsReg.total) * 100)
        : 0;
    insights.push({
      icon: '🔗',
      title: `${cross.matchByEmail.matched} Matched by Email · ${cross.gapAlumniEventOnlyCount} Need RE Records`,
      body: `${cross.matchByEmail.matched} guests matched across AlumniEvent and Raiser's Edge by email. ${cross.gapAlumniEventOnlyCount} registered guests could not be matched — consider adding them to Raiser's Edge for complete constituent coverage.`,
      priority: cross.gapAlumniEventOnlyCount > 50 ? 'High' : 'Medium',
      color: cross.gapAlumniEventOnlyCount > 50 ? '#e05252' : '#fb923c',
    });
  }

  // 10. Data mismatch (always include)
  insights.push({
    icon: '⚠️',
    title: 'Data Platform Mismatch Limits Analysis',
    body: 'The two files use different platforms and schemas. Raiser\'s Edge has giving data but no event details. AlumniEvent has rich event data but no giving history. Matching by email and Constituent ID enables cross-system analysis.',
    priority: 'High',
    color: '#e05252',
  });

  // 11. Low cross-source match (by name)
  const emailMatched = cross.matchByEmail?.matched ?? cross.retention.both;
  const minSize = Math.min(statsCRM.total, statsReg.total);
  if (minSize > 0 && emailMatched < minSize * 0.2) {
    insights.push({
      icon: '🔄',
      title: `Low Cross-Source Match (${emailMatched} by email)`,
      body: `Only ${emailMatched} people matched across Raiser's Edge and AlumniEvent. Many appear in one system only — check Data Quality tab. Email matching is most reliable; name matching can miss due to formatting differences.`,
      priority: 'Medium',
      color: '#fb923c',
    });
  }

  return insights;
}
