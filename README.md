# GRADSKOOL Daily Planner

A full-stack Next.js app for student study tracking with admin controls. Deploy on Vercel in minutes.

---

## Tech Stack

- **Frontend + API Routes**: Next.js 14 (Pages Router)
- **Database + Auth**: Supabase (free tier)
- **Hosting**: Vercel (free tier)
- **Passwords**: bcrypt hashing
- **Sessions**: JWT (7-day expiry)

---

## Setup Guide (Step by Step)

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Give it a name (e.g. `gradskool`) and set a strong DB password
3. Wait for the project to be ready (~1 min)
4. Go to **SQL Editor** → paste the entire contents of `supabase_schema.sql` → click **Run**
5. This creates all tables and seeds the admin account

### Step 2 — Get Your Supabase Keys

In Supabase Dashboard → **Project Settings** → **API**:

- Copy **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
- Copy **service_role secret** (NOT the anon key) → this is `SUPABASE_SERVICE_ROLE_KEY`

### Step 3 — Deploy to Vercel

#### Option A: via GitHub (recommended)

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/gradskool.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
3. Vercel auto-detects Next.js — no build config needed
4. Before deploying, add **Environment Variables** (Settings → Environment Variables):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `JWT_SECRET` | Any long random string (run `openssl rand -base64 32`) |

5. Click **Deploy** — done!

#### Option B: via Vercel CLI

```bash
npm i -g vercel
cd gradskool
vercel
# Follow prompts, then add env vars in the Vercel dashboard
```

---

## Admin Login

After deployment, go to your site and click **Log In**:

```
Email:    admin@gradskool.com
Password: admin123
```

> ⚠️ Change the admin password after first login by updating the bcrypt hash in the `admins` table via Supabase SQL Editor.

---

## How to Change Admin Password

1. Generate a new bcrypt hash (use [bcrypt-generator.com](https://bcrypt-generator.com) or run in Node):
   ```js
   const bcrypt = require('bcryptjs');
   bcrypt.hash('your_new_password', 10).then(console.log);
   ```
2. In Supabase → **Table Editor** → `admins` → update `password_hash`

---

## Project Structure

```
gradskool/
├── pages/
│   ├── _app.js           # Auth context, toast system, apiFetch
│   ├── _document.js      # HTML shell
│   ├── index.js          # Landing page (signup/login)
│   ├── dashboard.js      # Student dashboard
│   ├── admin.js          # Admin panel
│   ├── 404.js            # Not found
│   └── api/
│       ├── auth/
│       │   ├── login.js  # POST /api/auth/login
│       │   └── signup.js # POST /api/auth/signup
│       ├── student/
│       │   ├── today.js  # GET  /api/student/today
│       │   ├── log.js    # POST /api/student/log
│       │   └── progress.js # GET /api/student/progress
│       └── admin/
│           ├── students.js     # GET  /api/admin/students
│           ├── student-plan.js # GET/PUT /api/admin/student-plan
│           └── overview.js     # GET  /api/admin/overview
├── lib/
│   ├── supabase.js       # Supabase client
│   ├── auth.js           # JWT sign/verify + route guards
│   └── defaults.js       # Default tasks for 6H/8H/10H tracks
├── styles/
│   └── globals.css       # All styles (colour tokens, components)
├── supabase_schema.sql   # Run this in Supabase SQL Editor
├── .env.local.example    # Copy to .env.local and fill in values
├── next.config.js
└── package.json
```

---

## Features

### Student Side
- Sign up with name, email, password, track (6H / 8H / 10H)
- Daily task dashboard with time slots and section tags (VARC / LRDI / QA / MOCK)
- Mark tasks **Done** (one click) or **Skip** (requires written reason)
- Tomorrow is **locked** until all of today's tasks are resolved (done or skipped with reason)
- 14-day progress history with per-day completion stats and skip reasons
- Resources tab with iCAT schedule and philosophy

### Admin Side
- See all students with today's live completion %
- Click any student to edit their plan:
  - Change study track (auto-loads defaults)
  - Edit time slots, task names, and tags
  - Add or delete tasks
  - View recent skip reasons
- Overview tab: 14-day aggregate stats per student (done / skipped / missed)
- Schedule tab: iCAT and sectional calendar

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill env vars
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL, service key, and JWT secret

# 3. Run dev server
npm run dev
# Visit http://localhost:3000
```

---

## Customising the Planner

- **Default tasks** for each track: edit `lib/defaults.js`
- **Colours / fonts**: edit the `:root` variables in `styles/globals.css`
- **iCAT schedule**: edit the hardcoded list in `pages/admin.js` (Schedule tab) and `pages/dashboard.js` (Resources tab)
- **Admin email**: change the seed in `supabase_schema.sql` before running it
