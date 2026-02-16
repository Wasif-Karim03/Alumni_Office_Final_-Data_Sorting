import { useState, useRef } from 'react'

const C = {
  bg: '#0f1117', card: '#181b24', border: '#2a2e3b',
  accent: '#c8a455', accentGlow: 'rgba(200,164,85,0.15)',
  text: '#e8e6e1', textDim: '#8b8d95', textMuted: '#5a5c64',
  green: '#4ade80', red: '#e05252', blue: '#60a5fa'
}

const EVENT_TYPES = [
  { id: 'homecoming', label: 'Homecoming & Family Weekend', available: true },
  { id: 'reunion', label: 'Reunion Weekend', available: false },
  { id: 'owu_near_you', label: 'OWU Near You', available: false },
]

export default function UploadScreen({ onAnalyze, loading, error }) {
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [eventType, setEventType] = useState('homecoming')
  const [dragOver, setDragOver] = useState(null)
  const ref1 = useRef()
  const ref2 = useRef()

  const handleDrop = (e, which) => {
    e.preventDefault()
    setDragOver(null)
    const f = e.dataTransfer.files[0]
    if (f) which === '1' ? setFile1(f) : setFile2(f)
  }

  const handleDragOver = (e, which) => { e.preventDefault(); setDragOver(which) }
  const handleDragLeave = () => setDragOver(null)

  const FileBox = ({ label, which, file, setFile, inputRef }) => (
    <div
      onDrop={(e) => handleDrop(e, which)}
      onDragOver={(e) => handleDragOver(e, which)}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        flex: 1, minHeight: 180, borderRadius: 16,
        border: `2px dashed ${file ? C.green : dragOver === which ? C.accent : C.border}`,
        background: file ? `${C.green}08` : dragOver === which ? C.accentGlow : C.card,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s', gap: 12, padding: 24,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]) }}
      />
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: file ? `${C.green}22` : `${C.accent}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22
      }}>
        {file ? '✓' : '📄'}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: file ? C.green : C.text, marginBottom: 4 }}>
          {label}
        </div>
        {file ? (
          <div style={{ fontSize: 12, color: C.green }}>{file.name}</div>
        ) : (
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Drop CSV here or click to browse
          </div>
        )}
      </div>
      {file && (
        <button
          onClick={(e) => { e.stopPropagation(); setFile(null) }}
          style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textDim, padding: '4px 12px', borderRadius: 6,
            cursor: 'pointer', fontSize: 11
          }}
        >
          Remove
        </button>
      )}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 32
    }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: C.bg,
            fontFamily: "'DM Serif Display', Georgia, serif"
          }}>W</div>
          <h1 style={{
            fontSize: 32, fontWeight: 700, margin: '0 0 8px',
            fontFamily: "'DM Serif Display', Georgia, serif",
            color: C.text
          }}>
            OWU Alumni Analytics
          </h1>
          <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Analyze AlumniEvent (Almnabase) registration data. Add Raiser's Edge for giving, Greek affiliation, and cross-source matching.
          </p>
        </div>

        {/* Event Type Selection */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, fontWeight: 600 }}>
            What type of event data is this?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {EVENT_TYPES.map((ev) => (
              <button
                key={ev.id}
                onClick={() => ev.available && setEventType(ev.id)}
                disabled={!ev.available}
                style={{
                  padding: '12px 20px', borderRadius: 10,
                  border: `2px solid ${eventType === ev.id ? C.accent : C.border}`,
                  background: eventType === ev.id ? C.accentGlow : C.card,
                  color: ev.available ? (eventType === ev.id ? C.accent : C.text) : C.textMuted,
                  cursor: ev.available ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                  opacity: ev.available ? 1 : 0.6
                }}
              >
                {ev.label}
                {!ev.available && <span style={{ fontSize: 11, marginLeft: 6 }}>(coming soon)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Boxes */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <FileBox
            label="AlumniEvent (Almnabase) Registration Export"
            which="1"
            file={file1}
            setFile={setFile1}
            inputRef={ref1}
          />
          <FileBox
            label="Raiser's Edge (Blackbaud) Constituent Export (optional)"
            which="2"
            file={file2}
            setFile={setFile2}
            inputRef={ref2}
          />
        </div>

        {/* Expected columns hint */}
        <div style={{
          background: C.card, borderRadius: 12, padding: 16,
          border: `1px solid ${C.border}`, marginBottom: 24, fontSize: 12,
          color: C.textMuted, lineHeight: 1.7
        }}>
          <span style={{ color: C.accent, fontWeight: 600 }}>Expected formats:</span>
          <br />
          <strong style={{ color: C.textDim }}>AlumniEvent:</strong> Registration ID, Guest Full Name, Guest Type, Guest Email, Affiliations, Constituent Id, sub-event columns (Attending/Not Attending)
          <br />
          <strong style={{ color: C.textDim }}>Raiser's Edge:</strong> ID, Name, Email, Constituency Code, CL YR, LT Giving, WE Range, etc.
          <br />
          <span style={{ color: C.textMuted }}>Raiser's Edge is optional — upload alone for registration-only analysis. With both files, the system auto-detects which is which.</span>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: `${C.red}15`, borderRadius: 10, padding: 14,
            border: `1px solid ${C.red}33`, marginBottom: 20,
            fontSize: 13, color: C.red
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={() => file1 && onAnalyze(file1, file2, eventType)}
          disabled={!file1 || loading}
          style={{
            width: '100%', padding: '16px 32px', borderRadius: 12,
            border: 'none', fontSize: 16, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: file1 && !loading ? 'pointer' : 'not-allowed',
            background: file1
              ? `linear-gradient(135deg, ${C.accent}, ${C.accent}cc)`
              : C.border,
            color: file1 ? C.bg : C.textMuted,
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <span>Analyzing data...</span>
          ) : (
            <span>{file2 ? 'Generate Analytics Dashboard →' : 'Analyze Registration Data →'}</span>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 16 }}>
          Files are stored temporarily (20 min) for processing, then deleted automatically.
        </p>
      </div>
    </div>
  )
}
