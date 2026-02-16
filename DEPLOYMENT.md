# Deploy OWU Alumni Analytics to the Web

This guide walks you through deploying the app so anyone can use it. You'll deploy:
1. **Backend** (Node.js API) → Render.com (free)
2. **Frontend** (React app) → Vercel (free)

---

## Prerequisites

- A [GitHub](https://github.com) account
- Push your code to a GitHub repository

---

## Step 1: Deploy the Backend (Render)

1. Go to [render.com](https://render.com) and sign up (free).
2. Click **New** → **Web Service**.
3. Connect your GitHub repo and select the `owu-analytics` repository.
4. Configure:
   - **Name:** `owu-analytics-api` (or any name)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Click **Advanced** and add an **Environment Variable**:
   - Key: `FRONTEND_URL`
   - Value: Leave blank for now (you'll add it after deploying the frontend)
6. Click **Create Web Service**. Wait for the deploy to finish.
7. Copy your backend URL, e.g. `https://owu-analytics-api.onrender.com`

---

## Step 2: Deploy the Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (free).
2. Click **Add New** → **Project** and import your GitHub repo.
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add an **Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: Your backend URL from Step 1, e.g. `https://owu-analytics-api.onrender.com`
5. Click **Deploy**. Wait for the build to finish.
6. Copy your frontend URL, e.g. `https://owu-analytics-xxx.vercel.app`

---

## Step 3: Connect Backend to Frontend (CORS)

1. Go back to **Render** → your backend service → **Environment**.
2. Edit `FRONTEND_URL` and set it to your Vercel URL, e.g. `https://owu-analytics-xxx.vercel.app`
3. Save. Render will automatically redeploy.

---

## Step 4: Test

Open your Vercel URL in a browser. Upload your AlumniEvent and (optionally) Raiser's Edge files. The app should work.

---

## Notes

### Render Free Tier
- The backend **spins down after 15 minutes** of inactivity.
- The **first request** after spin-down may take 30–60 seconds (cold start).
- Subsequent requests are fast until it spins down again.

### Custom Domain (Optional)
- **Vercel:** Add a custom domain in Project Settings → Domains.
- **Render:** Add a custom domain in your service settings.
- Update `FRONTEND_URL` and `VITE_API_URL` if you change domains.

### Alternative Hosting
- **Backend:** Railway, Fly.io, Heroku, DigitalOcean
- **Frontend:** Netlify, Cloudflare Pages, GitHub Pages
