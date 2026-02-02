# Automated School Checklist

A task manager that syncs with Canvas LMS to automatically pull in your upcoming assignments, quizzes, discussions, etc.

## Features

- Auto-syncs assignments from Canvas (today through 2 weeks out)
- Manual sync button to force refresh
- Filter tasks by source (All / Canvas / Personal) and search by title
- Hide completed tasks toggle
- Add manual tasks with optional due dates
- Rename courses inline (click on course name)
- Color-coded due dates (red = overdue, orange = today, amber = tomorrow)
- Completion state persists across syncs

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/ZachDeLong/school-checklist.git
cd school-checklist
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get your Canvas API token

1. Log into your Canvas account
2. Go to **Account** > **Settings**
3. Scroll down to **Approved Integrations**
4. Click **+ New Access Token**
5. Give it a name (e.g., "School Checklist") and click **Generate Token**
6. Copy the token!

### 4. Configure your token

Create a `.env` file in the project root:

```
VITE_CANVAS_TOKEN=your_token_here
```

### 5. Configure your Canvas instance (if needed)

The app is configured for my school `ivc.instructure.com` by default. If your school uses a different Canvas URL, update `vite.config.ts`:

```ts
proxy: {
  '/canvas-api': {
    target: 'https://YOUR_SCHOOL.instructure.com',  // Change this
    // ...
  }
}
```

### 6. Run the development server

```bash
npm run dev
```

Open localhost in your browser.

## Important Notes

- **Development only**: The Canvas API proxy only works in development mode (`npm run dev`). For production deployment, you'd need a backend server to handle API requests.
- **Token security**: Never commit your `.env` file... obviously.
- **Rate limits**: Canvas has API rate limits so the app caches data and only re-syncs if data is older than 1 hour.
- **Browser compatibility**: Works best in Chrome/Edge. If Canvas sync fails, check your browser console for CORS errors.

## Tech Stack

- React 19
- Vite
- Zustand (state management)
- Zod (schema validation)
- Motion (animations)

## License

MIT
