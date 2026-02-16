# Deploy OWU Alumni Analytics to the Web

This guide walks you through deploying the app so anyone can use it. You'll deploy:
1. **Backend** (Node.js API) → Railway (recommended) or Render
2. **Frontend** (React app) → Vercel (free)

---

## Prerequisites

- A [GitHub](https://github.com) account
- Push your code to a GitHub repository

---

## Option A: Backend on Railway (Recommended)

### Step 1: Deploy the Backend (Railway)

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repo: `Wasif-Karim03/Alumni_Office_Final_-Data_Sorting` (or your fork).
4. Railway will create a service. Before it deploys, click the new service to open **Settings**.
5. Set **Root Directory** to `backend` (so Railway builds from the `backend` folder).
6. Under **Variables**, add:
   - `FRONTEND_URL` = leave blank for now (add after frontend deploys)
7. Under **Settings** → **Networking**, click **Generate Domain** to get a public URL.
8. Wait for the deploy to finish. Copy your backend URL, e.g. `https://owu-analytics-api-production-xxxx.up.railway.app`

### Step 2: Deploy the Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (free).
2. Click **Add New** → **Project** and import your GitHub repo.
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add an **Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: Your Railway backend URL, e.g. `https://owu-analytics-api-production-xxxx.up.railway.app`
5. Click **Deploy**. Wait for the build to finish.
6. Copy your frontend URL, e.g. `https://owu-analytics-xxx.vercel.app`

### Step 3: Connect Backend to Frontend (CORS)

1. Go back to **Railway** → your backend service → **Variables**.
2. Set `FRONTEND_URL` to your Vercel URL, e.g. `https://owu-analytics-xxx.vercel.app`
3. Railway will automatically redeploy.

### Step 4: Test

Open your Vercel URL in a browser. Upload your AlumniEvent and (optionally) Raiser's Edge files. The app should work.

---

### Alternative: Deploy Backend via Railway CLI (if GitHub repo doesn't appear)

If the repo doesn't show in Railway's GitHub picker, deploy from your terminal:

```bash
cd backend
railway login          # if not already logged in
railway init           # create new project, choose a name
railway up             # deploy
railway domain         # generate public URL
```

Then add `FRONTEND_URL` in Railway dashboard → your service → Variables. Continue with Step 2 (Vercel) above.

---

## Option B: Backend on Render (Free Tier)

### Step 1: Deploy the Backend (Render)

1. Go to [render.com](https://render.com) and sign up (free).
2. Click **New** → **Web Service**.
3. Connect your GitHub repo and select the repository.
4. Configure:
   - **Name:** `owu-analytics-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Add **Environment Variable:** `FRONTEND_URL` (leave blank for now).
6. Click **Create Web Service**. Copy your backend URL.

### Step 2–4: Same as Railway

Follow **Step 2–4** above (Vercel frontend, CORS, test).

---

## Notes

### Railway
- No cold starts; your backend stays running.
- Uses your subscription credits.

### Render Free Tier
- Backend **spins down after 15 minutes** of inactivity.
- First request after spin-down may take 30–60 seconds (cold start).

### Custom Domain (Optional)
- **Vercel:** Add a custom domain in Project Settings → Domains.
- **Railway/Render:** Add a custom domain in your service settings.
- Update `FRONTEND_URL` and `VITE_API_URL` if you change domains.

### Alternative Hosting
- **Backend:** Fly.io, Heroku, DigitalOcean
- **Frontend:** Netlify, Cloudflare Pages, GitHub Pages
