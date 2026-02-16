# OWU Alumni Analytics API

Node.js/Express backend for CSV analysis. Accepts two CSV file uploads and returns a structured JSON analytics object.

## Quick Start

```bash
cd backend
npm install
npm start
```

Server runs on **http://localhost:3001**

## API

### POST /api/analyze

Upload two CSV files (CRM export + Event Registration export).

```bash
curl -X POST http://localhost:3001/api/analyze \
  -F "file1=@HFW_2024.csv" \
  -F "file2=@2025-registration-export.csv"
```

**Request:** `multipart/form-data` with `file1` and `file2`

**Response:** JSON object with `stats2024`, `stats2025`, `cross`, `insights`

## Environment

- `PORT` — Server port (default: 3001)

## Frontend

The React frontend expects the API at `http://localhost:3001` during development. For production, set `VITE_API_URL` to your deployed backend URL.
