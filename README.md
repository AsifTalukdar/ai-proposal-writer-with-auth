# ⚡ ProposalAI — AI Proposal Writer for Freelancers

![ProposalAI Platform](https://img.shields.io/badge/ProposalAI-SaaS%20Platform-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_5-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel_Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)

**ProposalAI** is a production-ready, invite-only SaaS tool that turns raw job descriptions into polished, ready-to-send freelance proposals in seconds — for Upwork, Fiverr, PeoplePerHour, LinkedIn, and cold email outreach.

🔗 **Live Demo:** https://ai-proposal-writer-with-auth.vercel.app
🛒 **Purchase:** https://istasif.gumroad.com/l/tweyvt

---

## 🌟 Key Features

- **🔒 Invite-Only Auth** — Signup gated behind invite codes with usage limits, expiry, and deactivation. Supports Email/Password and Google OAuth via Supabase.
- **🧠 Dual AI Provider + Self-Healing Fallback** — Supports OpenRouter (free models) and OpenAI. Automatically falls back across 4 models if one is unavailable.
- **📊 Monthly Usage Tracking** — 100 proposals/month soft limit per user, tracked server-side with atomic DB upserts.
- **🎨 Rich Text Renderer** — Parses Markdown (`### headings`, `**bold**`, bullet lists) into clean, styled HTML output.
- **📥 One-Click Export** — Instantly export proposals as Word (.doc) or PDF.
- **📋 Proposal History** — Last 50 proposals saved to `localStorage` for quick reload and reuse.
- **🛡️ Zero Frontend Key Leakage** — All AI and DB service-role calls go through Vercel Serverless Functions. API keys never touch the browser.
- **⚡ IP-Based Rate Limiting** — 15 requests/minute per IP, enforced server-side.

---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS (Glassmorphic Design) |
| Routing | React Router v6 |
| Auth + DB | Supabase (Auth + PostgreSQL + RLS) |
| AI | OpenRouter API (free models by default) |
| API | Vercel Serverless Functions (`/api/`) |
| Deploy | Vercel |

**Default AI model:** `meta-llama/llama-3.3-70b-instruct:free`
**Fallback chain:** `google/gemma-4-31b-it:free` → `meta-llama/llama-3.2-3b-instruct:free` → `openai/gpt-oss-20b:free`

---

## 📂 Project Structure

```text
ai-proposal-writer-with-auth/
├── api/
│   ├── generate.js          # AI proxy — auth check, rate limit, usage tracking
│   └── invites.js           # Invite validate / use / create
├── src/
│   ├── components/
│   │   ├── AuthCallback.jsx # OAuth redirect handler
│   │   ├── Dashboard.jsx    # Usage stats and account info
│   │   ├── History.jsx      # Saved proposals panel
│   │   ├── Login.jsx        # Email + Google login
│   │   ├── Navbar.jsx       # Sticky top navigation
│   │   ├── OutputBox.jsx    # Generated proposal + export buttons
│   │   ├── ProposalApp.jsx  # Main proposal writer page
│   │   ├── ProposalForm.jsx # Form: type, tone, name, job description
│   │   ├── ProtectedRoute.jsx
│   │   ├── Signup.jsx       # 3-step: invite → details → done
│   │   └── UserMenu.jsx     # Dropdown: profile, sign out
│   ├── config/
│   │   └── constants.js     # Tones, proposal types, model config, limits
│   ├── hooks/
│   │   ├── useAuth.jsx      # Auth context: user, profile, usage
│   │   ├── useCopy.js       # Clipboard copy with textarea fallback
│   │   └── useLocalStorage.js
│   ├── services/
│   │   ├── ai.js            # Calls /api/generate
│   │   └── auth.js          # Supabase auth helpers
│   └── utils/
│       └── sanitize.js      # XSS + control character sanitizer
├── supabase-setup.sql       # Full DB schema — run this first
├── vercel.json              # Routes + function timeouts
├── vite.config.js
└── package.json
```

---

## 🗄️ Database Schema

3 tables. Run `supabase-setup.sql` in the Supabase SQL Editor to create everything at once.

```
users     → extends auth.users (id, email, full_name, avatar_url)
invites   → code, max_uses, used_count, expires_at, is_active
usage     → user_id, month_year, proposal_count (unique per user+month)
```

**DB Functions:**
- `increment_usage(user_id, month_year)` — atomic upsert, returns new count
- `handle_new_user()` — trigger: auto-creates user profile on signup

---

## 🚀 Setup & Deployment

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (free)
- [OpenRouter](https://openrouter.ai) account (free)
- [Vercel](https://vercel.com) account (free)

---

### 1. Clone and install

```bash
git clone https://github.com/AsifTalukdar/ai-proposal-writer-with-auth.git
cd ai-proposal-writer-with-auth
npm install
```

### 2. Create Supabase project

1. Go to https://supabase.com → New project
2. SQL Editor → New query → paste `supabase-setup.sql` → Run
3. All tables, RLS policies, triggers, and functions are created

### 3. Enable Google OAuth in Supabase *(optional)*

1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Add your Google Client ID and Secret
3. Add `https://your-project.supabase.co/auth/v1/callback` to Google Console → Authorized redirect URIs

### 4. Get your OpenRouter API key

1. Go to https://openrouter.ai → Sign up → Keys → Create key
2. Copy the key (starts with `sk-or-`)

Free credits are available on signup. The default model is free.

### 5. Configure environment variables

Create `.env.local` in the project root:

```bash
# Supabase — from Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxx

# Service role key — server-side only, NEVER prefix with VITE_
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxx

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx

# Your app URL (no trailing slash)
APP_URL=http://localhost:5173

# Admin secret for invite code creation via API (32+ random chars)
ADMIN_SECRET=change-this-to-something-long-and-random-32-chars
```

> ⚠️ **Never** prefix `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, or `ADMIN_SECRET` with `VITE_`. Anything with `VITE_` is bundled into client JavaScript and visible in the browser.

### 6. Create your first invite code

**Option A — Supabase SQL Editor:**
```sql
INSERT INTO public.invites (code, max_uses)
VALUES ('PRPSL-BETA01', 50);
```

**Option B — API call (after deploy):**
```bash
curl -X POST https://your-app.vercel.app/api/invites?action=create \
  -H "Content-Type: application/json" \
  -d '{"admin_secret":"your-admin-secret","max_uses":50}'
```

### 7. Run locally

```bash
npm run dev
```

Open http://localhost:5173 → go to `/signup` → enter invite code → create account → start writing proposals.

### 8. Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npm install -g vercel
vercel
# Add all env vars from .env.local when prompted
```

**Option B — GitHub:**
1. Push to GitHub
2. Vercel → New Project → Import repo
3. Add all 6 environment variables in Vercel → Settings → Environment Variables
4. Deploy

---

## 🔑 Environment Variables Reference

| Variable | Where to get | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | Client + Server |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Server only** |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys | **Server only** |
| `APP_URL` | Your deployed URL | Server |
| `ADMIN_SECRET` | Set yourself (32+ chars) | **Server only** |

---

## 🎟️ Invite Code System

Signup is a 3-step flow: **invite code → account details → done.**

| Property | Description |
|---|---|
| `max_uses` | How many accounts can use this code |
| `expires_at` | Auto-set to 30 days from creation |
| `is_active` | Auto-deactivated when `used_count >= max_uses` |

**Bulk create codes:**
```sql
INSERT INTO public.invites (code, max_uses) VALUES
  ('PRPSL-LAUNCH01', 100),
  ('PRPSL-REDDIT01', 50),
  ('PRPSL-BETA2024', 25);
```

**Deactivate a code:**
```sql
UPDATE public.invites SET is_active = false WHERE code = 'PRPSL-BETA01';
```

**Check usage:**
```sql
SELECT code, used_count, max_uses, expires_at, is_active
FROM public.invites ORDER BY created_at DESC;
```

---

## 📊 Usage Limits

Default soft limit: **100 proposals/month** per user.

To change it, update both places:

```js
// api/generate.js
SOFT_LIMIT: 100

// src/components/Dashboard.jsx
const SOFT_LIMIT = 100
```

The limit is "soft" — the API returns `atLimit: true`. Your frontend checks `proposalUsage.atLimit` to block further generation.

---

## 🤖 Changing the AI Model

In `src/config/constants.js`:
```js
export const MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
```

Also add your model to the `ALLOWED_MODELS` array in `api/generate.js` before using it.

**Free models on OpenRouter:**
```
meta-llama/llama-3.3-70b-instruct:free   ← default, best quality
google/gemma-4-31b-it:free
meta-llama/llama-3.2-3b-instruct:free
openai/gpt-oss-20b:free
```

**Paid models (better quality, small cost):**
```
anthropic/claude-haiku-4-5
openai/gpt-4o-mini
```

---

## ➕ Customization

**Add a new proposal type** — in `src/config/constants.js`:
```js
export const PROPOSAL_TYPES = [
  // ...existing types
  'Freelancer.com Proposal',  // ← add here
]
```

**Add a new tone:**
```js
export const TONES = [
  // ...existing tones
  { value: 'formal', label: 'Formal', emoji: '🎩' },
]
```

**Change rate limit** — in `api/generate.js`:
```js
RATE_LIMIT_WINDOW_MS: 60000,  // 1 minute window
RATE_LIMIT_MAX: 15,           // max requests per IP per window
```

---

## 🐛 Common Issues

| Issue | Fix |
|---|---|
| "Invalid or expired invite code" | Check `invites` table: `is_active = true`, `expires_at` in the future, `used_count < max_uses` |
| "Unauthorized. Please log in." | Session expired — sign out and back in. Verify `VITE_SUPABASE_URL` and anon key. |
| "Server misconfigured: Missing API key." | `OPENROUTER_API_KEY` is missing from Vercel env vars. Add it and redeploy. |
| "AI timed out. Try again." | Free models can be slow. Retry or switch to a faster paid model. Vercel timeout is 30s. |
| Google OAuth redirect fails | Add `https://your-project.supabase.co/auth/v1/callback` to Google Console. Also add Vercel URL to Supabase → Auth → URL Configuration → Redirect URLs. |
| Blank page after Vercel deploy | Check Vercel → Functions log. Most common cause: missing env variables. |

---

## 📄 API Documentation

An OpenAPI 3.0 spec (`openapi.yaml`) is included in the project root. Load it into [editor.swagger.io](https://editor.swagger.io) or Postman to explore and test endpoints interactively.

---

## 💳 License & Purchase

| | Standard — $29 | Extended — $149 |
|---|---|---|
| Personal use | ✅ | ✅ |
| Commercial use | ❌ | ✅ |
| Deployments | 1 | Unlimited |
| Client projects | ❌ | ✅ |
| Support | 6 months email | 12 months + future updates |

🛒 **Purchase:** https://istasif.gumroad.com/l/tweyvt

---

## 👤 Built By

**Istiaq Ahmed (Asif)** — CSE Graduate · Solo Developer · Bangladesh

- 🌐 Portfolio: [my-portfolio-istiaqahmed.vercel.app](https://my-portfolio-istiaqahmed.vercel.app)
- 💻 GitHub: [github.com/AsifTalukdar](https://github.com/AsifTalukdar)
- 📧 Support: istasif17@gmail.com *(reply to your Gumroad purchase email — 24hr response)*
- 🚀 Live: [ai-proposal-writer-with-auth.vercel.app](https://ai-proposal-writer-with-auth.vercel.app)