# Automated School Checklist

A task manager that syncs with Canvas LMS to automatically pull in your upcoming assignments, quizzes, discussions, etc.

## Features

- Auto-syncs assignments from Canvas (today through 7 days out)
- Support for multiple schools/Canvas instances
- Manual sync button to force refresh
- Filter tasks by source (All / Canvas / Personal) and search by title
- Hide completed tasks toggle
- Add manual tasks with optional due dates
- Drag-and-drop reordering
- Color-coded due dates (red = overdue, orange = today, amber = tomorrow)
- Completion state persists across syncs

## Quick Start (Hosted Version)

Just use the app at: **[school-checklist-lilac.vercel.app](https://school-checklist-lilac.vercel.app)**

### Setup

1. **Get your Canvas API token:**
   - Log into your school's Canvas
   - Go to **Account** → **Settings**
   - Scroll to **Approved Integrations**
   - Click **+ New Access Token**
   - Name it anything (e.g., "Checklist") and click **Generate Token**
   - **Copy the token immediately** - you won't see it again!

2. **Add your school in the app:**
   - Click the gear icon (⚙️) to open Settings
   - Click **Add School**
   - Enter a name (e.g., "IVC")
   - Enter your Canvas URL (e.g., `ivc-new.instructure.com`)
   - Paste your token
   - Click **Add School**

3. **Sync your assignments:**
   - Close settings and click the sync button (🔄)
   - Your assignments should appear!

### Multiple Schools

If you attend multiple schools with separate Canvas instances, add each one in Settings with its own URL and token.

**Note:** Some schools disable student API token generation. If you can't create a token, that's a school policy - nothing we can do about it.

## Self-Hosting / Development

If you want to run your own instance:

### Prerequisites

- Node.js 18+
- A Vercel account (for deployment)

### Local Development

```bash
git clone https://github.com/ZachDeLong/school-checklist.git
cd school-checklist
npm install
npm run dev
```

Note: Canvas sync won't work locally without the Vercel Edge Function. For local testing, deploy to Vercel first.

### Deploy to Vercel

1. Fork this repo
2. Import to Vercel
3. Deploy (no environment variables needed)
4. Make sure Deployment Protection is disabled for public access

## Tech Stack

- React 19
- Vite
- Zustand (state management)
- Zod (schema validation)
- Motion (animations)
- Vercel Edge Functions (Canvas API proxy)

## Privacy

- Your Canvas tokens are stored **only in your browser** (localStorage)
- The proxy server doesn't log or store any tokens
- Each user's data is completely isolated

## License

MIT
