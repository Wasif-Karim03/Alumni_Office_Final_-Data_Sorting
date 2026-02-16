# OWU Analytics – Setup & Deployment Guide

This document describes how the app is deployed and how to redeploy after making code changes. Use it when adding new features or fixing issues.

---

## Current Live URLs

| Component | URL |
|-----------|-----|
| **Frontend** | https://owu-analytics.vercel.app |
| **Backend API** | https://owu-analytics-production.up.railway.app |
| **Health check** | https://owu-analytics-production.up.railway.app/health |

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Vercel (Frontend)  │  ──────►│  Railway (Backend)  │
│  React + Vite       │  fetch  │  Node.js + Express  │
│  owu-analytics.app  │         │  /api/analyze       │
└─────────────────────┘         └─────────────────────┘
```

- **Frontend**: Vercel (auto-deploys from GitHub repo)
- **Backend**: Railway (deployed via CLI from `backend/` folder)

---

## Key Files & Directories

| Path | Purpose |
|------|---------|
| `src/App.jsx` | Main app entry; uses `VITE_API_URL` for API calls |
| `src/UploadScreen.jsx` | File upload UI |
| `src/Dashboard.jsx` | Analytics dashboard |
| `backend/server.js` | Express server; CORS config for `*.vercel.app` |
| `backend/routes/analyze.js` | `/api/analyze` endpoint |
| `backend/services/` | Parser, cross-analysis, insights logic |
| `src/theme.js` | OWU brand colors & fonts (from [OWU style guide](https://www.owu.edu/about/offices-services-directory/university-communications/web-services/website-style-guide-best-practices/colors-and-fonts/)) |

---

## Environment Variables

### Railway (Backend)

| Variable | Value | Purpose |
|----------|-------|---------|
| `FRONTEND_URL` | `https://owu-analytics.vercel.app` | CORS allowed origin (optional; `*.vercel.app` also allowed) |

### Vercel (Frontend)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://owu-analytics-production.up.railway.app` | Backend API base URL (must be set at build time) |

---

## Redeploying After Code Changes

### 1. Backend changes (anything in `backend/`)

From the project root:

```bash
cd backend
railway up
```

If multiple services exist: `railway up --service owu-analytics` (or the service name from `railway status`).

Wait 1–2 minutes for the deploy to finish.

### 2. Frontend changes (anything in `src/`, `index.html`, `vite.config.js`, etc.)

**Option A – Push to GitHub (recommended)**

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Vercel auto-deploys when you push to `main`.

**Option B – Manual redeploy**

1. Go to [vercel.com](https://vercel.com) → **owu-analytics** project
2. **Deployments** tab → **Redeploy** on the latest deployment

### 3. If you changed environment variables

- **Vercel**: Add or edit in Settings → Environment Variables, then **Redeploy**
- **Railway**: Add or edit in Variables; Railway redeploys automatically

---

## CORS & "Failed to fetch" Fix

The backend uses CORS in `backend/server.js`:

- Allows `http://localhost:5173` for local dev
- Allows `FRONTEND_URL` if set
- Allows any origin ending in `.vercel.app` (production and preview URLs)

If you add a new frontend (e.g. custom domain), either:

1. Set `FRONTEND_URL` in Railway to that URL, or  
2. Add another origin check in the CORS `origin` function in `server.js`

---

## GitHub Setup

- **Repo**: https://github.com/Wasif-Karim03/Alumni_Office_Final_-Data_Sorting
- **Branch**: `main` (Vercel deploys from this branch)

Push changes to `main` to trigger a new Vercel deployment.

---

## Local Development

```bash
# Terminal 1 – Backend
cd backend
npm install
npm start

# Terminal 2 – Frontend
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001  

The frontend uses `http://localhost:3001` when `VITE_API_URL` is not set.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Failed to fetch" | Check CORS in `backend/server.js`; ensure `*.vercel.app` or `FRONTEND_URL` is allowed. Redeploy backend. |
| Frontend calls wrong API | Ensure `VITE_API_URL` is set in Vercel and redeploy (env vars are baked in at build time). |
| Railway "Multiple services" | Use `railway up --service <service-name>` |
| Vercel 404 | Check deployment status in Vercel dashboard; redeploy if needed. |
| Backend not responding | Check Railway logs; verify `https://owu-analytics-production.up.railway.app/health` returns `{"status":"ok"}` |

---

## Quick Reference

| Task | Command / Action |
|------|------------------|
| Deploy backend | `cd backend && railway up` |
| Deploy frontend | `git push origin main` (or Vercel Redeploy) |
| Check backend health | Open https://owu-analytics-production.up.railway.app/health |
| Add backend env var | Railway → Variables |
| Add frontend env var | Vercel → Settings → Environment Variables → Redeploy |
