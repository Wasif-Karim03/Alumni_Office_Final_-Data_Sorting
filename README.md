# OWU Alumni Analytics

Analyze AlumniEvent (Almnabase) registration data with optional Raiser's Edge constituent data for comprehensive event analytics.

## Features

- **Registration analysis** – Total attendees, primary/accompanying guests, first-time vs returning
- **Constituency** – Affiliation breakdown, total alumni count
- **Sub-events** – Attendance by event
- **Demographics** – Geography, class year
- **Giving** (with RE) – Lifetime giving, tiers, wealth estimates
- **Greek & Majors** (with RE) – From Raiser's Edge
- **Export** – Download full report as Excel (multi-sheet)

## Quick Start

### Prerequisites

- Node.js 18+

### Run locally

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start backend (terminal 1)
cd backend && npm start

# Start frontend (terminal 2)
npm run dev
```

Open http://localhost:5173

### Deploy to production

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying to Render (backend) + Vercel (frontend).

## File formats

- **AlumniEvent**: CSV or Excel with Registration ID, Guest Type, Guest Email, Affiliations, etc.
- **Raiser's Edge**: CSV or Excel with ID, Email, Constituency Code, LT Giving, etc. (optional)

## License

Private / OWU internal use.
