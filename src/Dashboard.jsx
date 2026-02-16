import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

// ─── Theme ─────────────────────────────────────────────────

const C = {
  bg: '#0f1117', card: '#181b24', border: '#2a2e3b',
  accent: '#c8a455', accentDim: '#a08535', accentGlow: 'rgba(200,164,85,0.15)',
  text: '#e8e6e1', textDim: '#8b8d95', textMuted: '#5a5c64',
  red: '#e05252', green: '#4ade80', blue: '#60a5fa', purple: '#a78bfa',
  orange: '#fb923c', teal: '#2dd4bf', pink: '#f472b6', indigo: '#818cf8',
}

const CAT_COLORS = {
  General: C.accent, Family: C.blue, Academic: C.green,
  Athletics: C.pink, Greek: C.purple, 'Invite-Only': C.orange
}

const fmtDollar = (n) => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}
const fmtN = (n) => Number(n).toLocaleString()


// ─── Reusable Components ───────────────────────────────────

const StatCard = ({ label, value, sub, color = C.accent }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4
  }}>
    <span style={{ fontSize: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1.1 }}>{value}</span>
    {sub && <span style={{ fontSize: 13, color: C.textMuted }}>{sub}</span>}
  </div>
)

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 16, marginTop: 8 }}>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{children}</h3>
    {sub && <p style={{ fontSize: 13, color: C.textDim, margin: '4px 0 0' }}>{sub}</p>}
  </div>
)

const ChartCard = ({ children, title, sub, style: s }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, ...s }}>
    {title && <SectionTitle sub={sub}>{title}</SectionTitle>}
    {children}
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e2230', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.accent, fontSize: 12 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? fmtN(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

const PieLegend = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
    {items.map(([label, value, color]) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ color: C.textDim }}>{label}:</span>
        <span style={{ color: C.text, fontWeight: 600 }}>{value}</span>
      </div>
    ))}
  </div>
)


// ─── TABS ──────────────────────────────────────────────────

function OverviewTab({ s24, s25, cross, hasRE }) {
  const monthData = Object.entries(s25.registrationMonths || {})
  const monthTotal = monthData.reduce((a, [, v]) => a + v, 0)
  const matchedCount = cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Total Attendees" value={fmtN(s25.total)} sub={`${s25.uniqueRegistrations} registrations`} />
        <StatCard label="Primary Guests" value={fmtN(s25.primaryGuests)} sub="Completed registration" />
        <StatCard label="First-Time Attendees" value={fmtN(s25.firstTimers)}
          sub={s25.firstTimers + s25.returning > 0 ? `${Math.round(s25.firstTimers / (s25.firstTimers + s25.returning) * 100)}% of respondents` : ''}
          color={C.green}
        />
        {hasRE && (
          <StatCard label="With RE Data" value={fmtN(matchedCount)} sub={`of ${fmtN(s25.total)} — giving/demographics`} color={C.accent} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Registration Status" sub={`Out of ${fmtN(s25.total)} total guests`}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[
                    { name: 'Successful', value: s25.successful },
                    { name: 'Pending', value: s25.pending },
                    { name: 'Cancelled', value: s25.cancelled }
                  ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                    <Cell fill={C.green} /><Cell fill={C.orange} /><Cell fill={C.red} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend items={[
              ['Successful', s25.successful, C.green],
              ['Pending', s25.pending, C.orange],
              ['Cancelled', s25.cancelled, C.red]
            ].filter(([, v]) => v > 0)} />
          </div>
        </ChartCard>

        <ChartCard title="Guest Composition">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[
                    { name: 'Primary', value: s25.primaryGuests },
                    { name: 'Accompanying', value: s25.accompanyingGuests }
                  ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                    <Cell fill={C.accent} /><Cell fill={C.blue} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <PieLegend items={[
                ['Primary', s25.primaryGuests, C.accent],
                ['Accompanying', s25.accompanyingGuests, C.blue]
              ]} />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                Avg {s25.uniqueRegistrations > 0 ? (s25.total / s25.uniqueRegistrations).toFixed(1) : '—'} guests per registration
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {monthData.length > 0 && (
        <ChartCard title="Registration Timeline" sub="Monthly registration volume">
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {monthData.map(([month, count]) => (
              <div key={month} style={{ flex: 1, background: C.bg, borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 4 }}>{month}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.accent, fontFamily: "'DM Serif Display', Georgia, serif" }}>{count}</div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${(count / monthTotal * 100)}%`, background: C.accent, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  {monthTotal > 0 ? `${(count / monthTotal * 100).toFixed(1)}%` : '—'} of total
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}


function ConstituencyTab({ s24, s25, cross, hasRE }) {
  const matchedCount = cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0
  const totalAlumni = s25.totalAlumni ?? 0
  const regAff = useMemo(() =>
    Object.entries(s25.constituency || {}).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 18) + '...' : name, value })),
    [s25]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {totalAlumni > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${C.accent}44`,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {fmtN(totalAlumni)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Total Alumni</div>
            <div style={{ fontSize: 12, color: C.textDim }}>
              Attendees who selected Alumni (alone or with Parent, Trustee, etc.)
            </div>
          </div>
        </div>
      )}

      <ChartCard title="Attendee Affiliations" sub="From AlumniEvent registration — who attended, by type">
        <ResponsiveContainer width="100%" height={Math.max(280, regAff.length * 36)}>
          <BarChart data={regAff} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" tick={{ fill: C.textDim, fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={C.accent} radius={[0, 4, 4, 0]} name="Attendees" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {hasRE && s24.total > 0 && (
        <ChartCard title="Raiser's Edge Enrichment" sub={`For ${matchedCount} matched attendees — constituency in RE`}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cross.constituencyShifts.length, 5)}, 1fr)`, gap: 12, marginTop: 12 }}>
            {cross.constituencyShifts.map(s => (
              <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{s.v2024}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>matched in RE</div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}


function EventsTab({ s25 }) {
  const [filter, setFilter] = useState('All')
  const cats = useMemo(() => {
    const set = new Set(s25.subEvents.map(e => e.cat))
    return ['All', ...set]
  }, [s25])
  const filtered = filter === 'All' ? s25.subEvents : s25.subEvents.filter(e => e.cat === filter)
  const avgAttendance = s25.subEvents.length > 0
    ? Math.round(s25.subEvents.reduce((a, e) => a + e.count, 0) / s25.subEvents.length)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total Sub-Events" value={s25.subEvents.length} color={C.accent} />
        <StatCard label="Most Popular" value={s25.subEvents[0]?.name || '—'} sub={`${s25.subEvents[0]?.count || 0} attendees`} color={C.green} />
        <StatCard label="Avg Attendance" value={avgAttendance} sub="Per sub-event" color={C.blue} />
      </div>

      <ChartCard title="Sub-Event Attendance" sub="Filter by category">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${filter === c ? C.accent : C.border}`,
              background: filter === c ? C.accentGlow : 'transparent',
              color: filter === c ? C.accent : C.textDim,
              cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.2s'
            }}>{c}</button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={Math.max(300, filtered.length * 32)}>
          <BarChart data={filtered} layout="vertical" margin={{ left: 160, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" tick={{ fill: C.textDim, fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} width={160} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Attending" radius={[0, 4, 4, 0]}>
              {filtered.map((e, i) => <Cell key={i} fill={CAT_COLORS[e.cat] || C.accent} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Event Categories Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 8 }}>
          {Object.entries(
            s25.subEvents.reduce((acc, e) => {
              acc[e.cat] = acc[e.cat] || { count: 0, total: 0 }
              acc[e.cat].count++
              acc[e.cat].total += e.count
              return acc
            }, {})
          ).sort((a, b) => b[1].total - a[1].total).map(([cat, v]) => (
            <div key={cat} style={{ background: C.bg, borderRadius: 8, padding: 14, borderLeft: `3px solid ${CAT_COLORS[cat] || C.accent}` }}>
              <div style={{ fontSize: 11, color: CAT_COLORS[cat] || C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{cat}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4, fontFamily: "'DM Serif Display', Georgia, serif" }}>{v.total}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{v.count} events · avg {Math.round(v.total / v.count)}</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}


function GivingTab({ s24, s25, cross, hasRE }) {
  if (!hasRE) return <NoREDataPlaceholder title="Giving Data Requires Raiser's Edge" />
  const g = s24.giving
  const matchedCount = cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0
  if (!g) return <div style={{ color: C.textDim, padding: 40, textAlign: 'center' }}>No giving data. Raiser's Edge adds giving info for matched attendees.</div>

  const tierData = Object.entries(g.tiers).map(([tier, count]) => ({ tier, count }))
  const tierColors = [C.textMuted, '#94a3b8', C.blue, '#3b82f6', '#2563eb', '#1d4ed8']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 8, fontSize: 13, color: C.textDim }}>
        <strong style={{ color: C.accent }}>Raiser's Edge enrichment:</strong> Giving data for {fmtN(matchedCount)} of {fmtN(s25.total)} attendees. Many attendees may not be in RE yet.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Lifetime Giving" value={fmtDollar(g.lifetimeTotal)} sub={`For ${matchedCount} matched attendees`} color={C.accent} />
        <StatCard label="Active Donors" value={fmtN(g.donorsCount)} sub={`of ${fmtN(s24.total)} (${Math.round(g.donorsCount / s24.total * 100)}%)`} color={C.green} />
        <StatCard label="Median Last Gift" value={fmtDollar(g.lastGiftMedian)} sub={`Mean: ${fmtDollar(g.lastGiftMean)} (skewed)`} color={C.blue} />
        <StatCard label="Top Donor LT" value={fmtDollar(g.lifetimeMax)} sub="Largest lifetime total" color={C.purple} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {s24.fyGiving && s24.fyGiving.length > 0 && (
          <ChartCard title="Annual Fund Trend" sub="Total giving from event attendees">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={s24.fyGiving} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={{ fill: C.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: C.textDim, fontSize: 11 }} tickFormatter={v => fmtDollar(v)} />
                <Tooltip content={<CustomTooltip />} formatter={v => [fmtDollar(v), 'Annual Fund']} />
                <Line type="monotone" dataKey="amount" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} name="Annual Fund" />
              </LineChart>
            </ResponsiveContainer>
            {s24.fyGiving.length >= 2 && (() => {
              const first = s24.fyGiving[0].amount
              const last = s24.fyGiving[s24.fyGiving.length - 1].amount
              const growth = first > 0 ? Math.round((last - first) / first * 100) : 0
              return growth !== 0 && (
                <div style={{ fontSize: 12, color: growth > 0 ? C.green : C.red, textAlign: 'center', marginTop: 4 }}>
                  {growth > 0 ? '▲' : '▼'} {Math.abs(growth)}% growth over period
                </div>
              )
            })()}
          </ChartCard>
        )}

        <ChartCard title="Giving Tier Distribution" sub="Lifetime giving ranges">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tierData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="tier" tick={{ fill: C.textDim, fontSize: 10 }} />
              <YAxis tick={{ fill: C.textDim, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Registrants" radius={[4, 4, 0, 0]}>
                {tierData.map((_, i) => <Cell key={i} fill={tierColors[i] || C.accent} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 4 }}>
            {Math.round(g.nonDonors / s24.total * 100)}% have never given · {tierData[tierData.length - 1]?.count || 0} are {tierData[tierData.length - 1]?.tier} donors
          </div>
        </ChartCard>
      </div>

      {Object.keys(s24.wealthEstimate).length > 0 && (
        <ChartCard title="Wealth Estimate vs. Internal Gift Capacity" sub="Number of registrants per range">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(() => {
              const order = ['$1-$2,499', '$2,500-$4,999', '$5,000-$9,999', '$10,000-$14,999', '$15,000-$24,999', '$25,000-$49,999', '$50,000-$99,999', '$100,000-$249,999', '$250,000-$499,999', '$500,000-$999,999', '$1,000,000-$4,999,999', '$5,000,000+']
              const short = ['$1-2.5K', '$2.5-5K', '$5-10K', '$10-15K', '$15-25K', '$25-50K', '$50-100K', '$100-250K', '$250-500K', '$500K-1M', '$1-5M', '$5M+']
              return order.map((r, i) => ({
                range: short[i], we: s24.wealthEstimate[r] || 0, gc: s24.giftCapacity[r] || 0
              })).filter(d => d.we > 0 || d.gc > 0)
            })()} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="range" tick={{ fill: C.textDim, fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: C.textDim, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.textDim }} />
              <Bar dataKey="we" name="Wealth Estimate" fill={C.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gc" name="Gift Capacity" fill={C.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}


function DemographicsTab({ s24, s25, cross, hasRE }) {
  const matchedCount = cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0
  const greekData = useMemo(() =>
    Object.entries(s24.greek || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => {
      const type = name.toLowerCase().includes('sorority') || name.toLowerCase().includes('gamma') || name.toLowerCase().includes('theta') || name.toLowerCase().includes('delta') && name.toLowerCase().includes('delta')
        ? (name.toLowerCase().includes('fraternity') ? 'Fraternity' : 'Sorority')
        : name.toLowerCase().includes('fraternity') ? 'Fraternity' : 'Other'
      const shortName = name.replace(' Sorority', '').replace(' Fraternity', '').replace(' Inc.', '')
      return { name: shortName.length > 20 ? shortName.substring(0, 18) + '...' : shortName, count, type }
    }), [s24]
  )

  const majorData = useMemo(() =>
    Object.entries(s24.majors || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({
      name: name.length > 18 ? name.substring(0, 16) + '...' : name, count
    })), [s24]
  )

  // Use AlumniEvent (s25) geography as primary - where attendees are from
  const geoData = useMemo(() => {
    const states = s25.states || {}
    return Object.entries(states).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([state, count]) => ({ state, count }))
  }, [s25])

  const isOhio = (s) => ['OH', 'Ohio'].includes(s)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {geoData.length > 0 && (
        <ChartCard title="Where Attendees Are From" sub={`From AlumniEvent registration${s25.ohioPct > 0 ? ` · Ohio: ${geoData.find(g => isOhio(g.state))?.count ?? '—'} attendees (~${s25.ohioPct}%)` : ''}`}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={geoData} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.textDim, fontSize: 11 }} />
              <YAxis type="category" dataKey="state" tick={{ fill: C.textDim, fontSize: 11 }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                name="Attendees"
                fill={C.accent}
                radius={[0, 4, 4, 0]}
                label={({ x, y, width, value, payload }) => {
                  const showPct = isOhio(payload?.state) && s25.ohioPct > 0
                  return (
                    <text x={x + width + 6} y={y + 10} fill={C.textDim} fontSize={11} textAnchor="start">
                      {(value ?? 0).toLocaleString()}{showPct ? ` · ~${s25.ohioPct}%` : ''}
                    </text>
                  )
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {cross.classDecades?.length > 0 && (
        <ChartCard title="Class Year (Attendees)" sub="From registration form">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cross.classDecades} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="decade" tick={{ fill: C.textDim, fontSize: 11 }} />
              <YAxis tick={{ fill: C.textDim, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="y2025" name="Attendees" fill={C.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasRE && greekData.length > 0 && (
        <ChartCard title="Greek Affiliation" sub={`From Raiser's Edge — for ${matchedCount} matched attendees`}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={greekData} layout="vertical" margin={{ left: 110, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.textDim, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                {greekData.map((e, i) => <Cell key={i} fill={e.type === 'Sorority' ? C.pink : e.type === 'Fraternity' ? C.blue : C.textMuted} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasRE && majorData.length > 0 && (
        <ChartCard title="Top Majors" sub={`From Raiser's Edge — for ${matchedCount} matched attendees`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={majorData} layout="vertical" margin={{ left: 110, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.textDim, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Alumni" fill={C.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {!hasRE && (
        <div style={{ background: `${C.orange}10`, border: `1px dashed ${C.orange}44`, borderRadius: 12, padding: 20, fontSize: 13, color: C.textDim }}>
          <strong style={{ color: C.orange }}>Greek affiliation and majors</strong> come from Raiser's Edge. Upload an RE constituent export to see this data.
        </div>
      )}
    </div>
  )
}


function CrossSourceMatchTab({ s24, s25, cross, hasRE }) {
  if (!hasRE) return <NoREDataPlaceholder title="RE Enrichment Requires Raiser's Edge" />
  const matched = cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0
  const noMatch = s25.total - matched

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <StatCard label="Attendees With RE Data" value={fmtN(matched)} sub="Giving, demographics available" color={C.green} />
        <StatCard label="Attendees Without RE Match" value={fmtN(noMatch)} sub="Add to Raiser's Edge for full data" color={C.orange} />
      </div>

      <ChartCard title="Attendee Enrichment" sub="AlumniEvent = who attended. Raiser's Edge adds giving/demographics where we can match.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: '30px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.accent}22, ${C.accent}44)`,
              border: `2px solid ${C.accent}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: "'DM Serif Display', Georgia, serif" }}>{s25.total}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>Total Attendees</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>(AlumniEvent)</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{fmtN(matched)} with RE data</div>
            <div style={{ width: 80, height: 2, background: C.green }} />
            <div style={{ fontSize: 13, color: C.orange }}>{fmtN(noMatch)} no RE match</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `${C.green}22`, border: `2px solid ${C.green}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>{matched}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>Enriched</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: 14, fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
          <span style={{ color: C.orange, fontWeight: 600 }}>Expected:</span> Raiser's Edge often won't have everyone who registered. Attendees without a match are candidates to add to RE for future giving/demographic tracking.
        </div>
      </ChartCard>

      {(s25.firstTimers > 0 || s25.returning > 0) && (
        <ChartCard title="First-Time vs Returning Attendees" sub="Self-reported in registration">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: 'First Time', value: s25.firstTimers },
                  { name: 'Returning', value: s25.returning }
                ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                  <Cell fill={C.green} /><Cell fill={C.accent} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['First-Time', s25.firstTimers, C.green, 'Potential new donors & engaged alumni'],
                ['Returning', s25.returning, C.accent, 'Loyal base — nurture & deepen']
              ].filter(([, v]) => v > 0).map(([l, v, c, d]) => {
                const total = s25.firstTimers + s25.returning
                return (
                  <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
                        {l}: {fmtN(v)} ({total > 0 ? Math.round(v / total * 100) : 0}%)
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{d}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  )
}


function DataQualityTab({ s24, s25, cross, hasRE }) {
  if (!hasRE) return <NoREDataPlaceholder title="Data Quality Matching Requires Raiser's Edge" />
  const emailMatch = cross.matchByEmail
  const idMatch = cross.matchByConstituentId
  const gapByAff = cross.gapAlumniEventOnly || {}
  const gapCount = cross.gapAlumniEventOnlyCount ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ChartCard title="Attendee Match Summary" sub="How many attendees have Raiser's Edge data (for giving, demographics)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
          {emailMatch && (
            <div style={{ background: C.bg, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 16 }}>By Email</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textDim }}>Matched (have RE data)</span>
                  <span style={{ color: C.green, fontWeight: 700 }}>{fmtN(emailMatch.matched)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textDim }}>No RE match</span>
                  <span style={{ color: C.orange, fontWeight: 600 }}>{fmtN(emailMatch.alumniEventOnly)}</span>
                </div>
              </div>
            </div>
          )}
          {idMatch && idMatch.matched > 0 && (
            <div style={{ background: C.bg, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 16 }}>By Constituent ID</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textDim }}>Matched</span>
                  <span style={{ color: C.green, fontWeight: 700 }}>{fmtN(idMatch.matched)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      {gapCount > 0 && (
        <ChartCard title="Attendees to Add to Raiser's Edge" sub={`${fmtN(gapCount)} attendees have no RE match — add them for giving/demographic tracking`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
            {Object.entries(gapByAff)
              .sort((a, b) => b[1] - a[1])
              .map(([aff, count]) => (
                <div key={aff} style={{ background: C.bg, borderRadius: 8, padding: 14, borderLeft: `3px solid ${C.orange}` }}>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{aff}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{count}</div>
                </div>
              ))}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.6 }}>
            <strong style={{ color: C.orange }}>Priority:</strong> Alumni and Parent records should be added to Raiser's Edge. Friends may be evaluated for prospect creation.
          </div>
        </ChartCard>
      )}
    </div>
  )
}


function InsightsTab({ insights }) {
  if (!insights || insights.length === 0) {
    return <div style={{ color: C.textDim, padding: 40, textAlign: 'center' }}>No insights generated.</div>
  }

  const high = insights.filter(i => i.priority === 'High').length
  const med = insights.filter(i => i.priority === 'Medium').length
  const low = insights.filter(i => i.priority === 'Low').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
        {[['High Priority', high, C.red], ['Medium Priority', med, C.orange], ['Low Priority', low, C.green]].map(([l, c, clr]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: clr }} />
            <span style={{ fontSize: 13, color: C.textDim }}>{l}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: clr, marginLeft: 'auto', fontFamily: "'DM Serif Display', Georgia, serif" }}>{c}</span>
          </div>
        ))}
      </div>

      {insights.map((ins, i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 22px', borderLeft: `3px solid ${ins.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{ins.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{ins.title}</span>
            <span style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 12,
              background: `${ins.color}22`, color: ins.color,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5
            }}>{ins.priority}</span>
          </div>
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, margin: 0 }}>{ins.body}</p>
        </div>
      ))}
    </div>
  )
}


// ─── Main Dashboard ────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'constituency', label: 'Constituency', icon: '◎' },
  { id: 'events', label: 'Events', icon: '◈' },
  { id: 'giving', label: 'Giving', icon: '◇' },
  { id: 'demographics', label: 'Demographics', icon: '◆' },
  { id: 'crosssource', label: 'RE Enrichment', icon: '◐' },
  { id: 'dataquality', label: 'Data Quality', icon: '◔' },
  { id: 'insights', label: 'Insights', icon: '◑' },
]

const EVENT_LABELS = { homecoming: 'Homecoming & Family Weekend', reunion: 'Reunion Weekend', owu_near_you: 'OWU Near You' }

const NoREDataPlaceholder = ({ title }) => (
  <div style={{
    background: `${C.orange}12`, border: `1px dashed ${C.orange}66`,
    borderRadius: 12, padding: 40, textAlign: 'center'
  }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
    <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: C.textDim, maxWidth: 400, margin: '0 auto' }}>
      This section requires Raiser's Edge constituent data. Upload an RE export alongside your AlumniEvent file to see giving, Greek affiliation, majors, and cross-source matching.
    </div>
  </div>
)

function toEntries(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Array.isArray(obj) ? obj.map((v, i) => [i, v]) : Object.entries(obj)
}

function toArray(val) {
  return Array.isArray(val) ? val : []
}

function downloadExport(data, fileNames, eventType) {
  try {
  const s25 = data?.stats2025 || {}
  const s24 = data?.stats2024 || {}
  const cross = data?.cross || {}
  const hasRE = data?.hasRE ?? (s24?.total > 0)
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryRows = [
    ['Metric', 'Value'],
    ['Event Type', eventType || 'homecoming'],
    ['Exported At', new Date().toISOString()],
    ['Registration File', fileNames?.f2024 || ''],
    ['Raiser\'s Edge File', fileNames?.f2025 || ''],
    ['Total Attendees', s25.total ?? 0],
    ['Unique Registrations', s25.uniqueRegistrations ?? 0],
    ['Primary Guests', s25.primaryGuests ?? 0],
    ['Accompanying Guests', s25.accompanyingGuests ?? 0],
    ['First-Time Attendees', s25.firstTimers ?? 0],
    ['Returning Attendees', s25.returning ?? 0],
    ['Total Alumni', s25.totalAlumni ?? 0],
    ['With RE Data', cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0],
    ['Has Raiser\'s Edge', hasRE ? 'Yes' : 'No'],
    ['Registration Successful', s25.successful ?? ''],
    ['Registration Pending', s25.pending ?? ''],
    ['Registration Cancelled', s25.cancelled ?? ''],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')

  // Sheet 2: Constituency
  const constituencyRows = [['Affiliation', 'Count']]
  for (const [name, count] of toEntries(s25.constituency)) {
    constituencyRows.push([name, count])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(constituencyRows), 'Constituency')

  // Sheet 3: Geography
  const geoRows = [['State', 'Count']]
  for (const [state, count] of toEntries(s25.states)) {
    geoRows.push([state, count])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(geoRows), 'Geography')

  // Sheet 4: Sub-Events
  const subEventRows = [['Event', 'Attendees', 'Category']]
  for (const e of toArray(s25.subEvents)) {
    subEventRows.push([e?.name ?? '', e?.count ?? '', e?.cat ?? ''])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(subEventRows), 'Sub-Events')

  // Sheet 5: Class Decades
  const decadeRows = [['Decade', 'RE Count', 'Registration Count']]
  for (const d of toArray(cross.classDecades)) {
    decadeRows.push([d?.decade ?? '', d?.y2024 ?? '', d?.y2025 ?? ''])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(decadeRows), 'Class Decades')

  if (hasRE) {
    // Sheet 6: Giving
    if (s24.giving) {
      const g = s24.giving
      const givingRows = [
        ['Metric', 'Value'],
        ['Lifetime Total', g.lifetimeTotal ?? 0],
        ['Donors Count', g.donorsCount ?? 0],
        ['Non-Donors', g.nonDonors ?? 0],
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(givingRows), 'Giving')

      // Sheet 7: Giving Tiers
      const tierRows = [['Tier', 'Count']]
      for (const [tier, count] of toEntries(g.tiers)) {
        tierRows.push([tier, count])
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tierRows), 'Giving Tiers')
    }

    // Sheet 8: Greek Affiliation
    const greekRows = [['Organization', 'Count']]
    for (const [name, count] of toEntries(s24.greek)) {
      greekRows.push([name, count])
    }
    if (greekRows.length > 1) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(greekRows), 'Greek')
    }

    // Sheet 9: Majors
    const majorRows = [['Major', 'Count']]
    for (const [name, count] of toEntries(s24.majors)) {
      majorRows.push([name, count])
    }
    if (majorRows.length > 1) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(majorRows), 'Majors')
    }
  }

  // Sheet: Insights
  const insightsArr = toArray(data?.insights)
  if (insightsArr.length > 0) {
    const insightRows = [['#', 'Title', 'Summary']]
    for (let i = 0; i < insightsArr.length; i++) {
      const ins = insightsArr[i]
      insightRows.push([i + 1, ins?.title ?? '', ins?.body ?? ''])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insightRows), 'Insights')
  }

  const filename = `owu-analytics-${eventType || 'report'}-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
  } catch (err) {
    console.error('Export failed:', err)
    alert('Export failed: ' + (err.message || 'Unknown error'))
  }
}

export default function Dashboard({ data, fileNames, onReset }) {
  const [activeTab, setActiveTab] = useState('overview')
  const { stats2024: s24, stats2025: s25, cross, insights, eventType, hasRE } = data
  const hasREData = hasRE ?? (s24?.total > 0)

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'constituency': return <ConstituencyTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'events': return <EventsTab s25={s25} />
      case 'giving': return <GivingTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'demographics': return <DemographicsTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'crosssource': return <CrossSourceMatchTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'dataquality': return <DataQualityTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
      case 'insights': return <InsightsTab insights={insights} />
      default: return <OverviewTab s24={s24} s25={s25} cross={cross} hasRE={hasREData} />
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: C.bg
          }}>W</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              OWU Alumni Analytics
            </h1>
            <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
              {EVENT_LABELS[eventType] || 'Homecoming & Family Weekend'} · Event Summary
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'right' }}>
              <div>{fileNames.f2024}{fileNames.f2025 ? ` · ${fileNames.f2025}` : ''}</div>
              <div>{fmtN(s25.total)} attendees{hasREData ? ` · ${fmtN(cross?.matchedRegistrants ?? cross?.matchByEmail?.matched ?? 0)} with RE data` : ' · AlumniEvent only'}</div>
            </div>
            <button
              onClick={() => downloadExport(data, fileNames, eventType)}
              style={{
                background: C.accentGlow, border: `1px solid ${C.accent}66`,
                color: C.accent, padding: '6px 14px', borderRadius: 8,
                cursor: 'pointer', fontSize: 12, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6
              }}
              title="Download full analytics as Excel"
            >
              ↓ Export
            </button>
            <button onClick={onReset} style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textDim, padding: '6px 14px', borderRadius: 8,
              cursor: 'pointer', fontSize: 12, transition: 'all 0.2s'
            }}>
              ← Upload New Files
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{
          width: 200, borderRight: `1px solid ${C.border}`, padding: '16px 0',
          flexShrink: 0, position: 'sticky', top: 0, height: 'calc(100vh - 73px)', overflowY: 'auto'
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              width: '100%', padding: '10px 24px', border: 'none',
              background: activeTab === tab.id ? C.accentGlow : 'transparent',
              color: activeTab === tab.id ? C.accent : C.textDim,
              cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 0.15s',
              borderLeft: activeTab === tab.id ? `2px solid ${C.accent}` : '2px solid transparent',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(100vh - 73px)' }}>
          {renderTab()}
        </div>
      </div>
    </div>
  )
}
