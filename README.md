# School Checklist

A personal task manager that syncs with Canvas LMS to automatically pull in your upcoming assignments, quizzes, and discussions.

## Features

- Auto-syncs assignments from Canvas (today through 2 weeks out)
- Shows course name and due date for each task
- Color-coded due dates (red = overdue, orange = today, amber = tomorrow)
- Add manual tasks alongside Canvas assignments
- Completion state persists across syncs
- Confetti celebration when all tasks are done

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
6. Copy the token (you won't be able to see it again)

### 4. Configure your token

Create a `.env.local` file in the project root:

```
VITE_CANVAS_TOKEN=your_token_here
```

### 5. Configure your Canvas instance (if needed)

The app is configured for `ivc.instructure.com` by default. If your school uses a different Canvas URL, update `vite.config.ts`:

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

Open http://localhost:5173 in your browser.

## Important Notes

- **Development only**: The Canvas API proxy only works in development mode (`npm run dev`). For production deployment, you'd need a backend server to handle API requests.
- **Token security**: Never commit your `.env.local` file. It's already in `.gitignore`.
- **Rate limits**: Canvas has API rate limits. The app caches data and only re-syncs if data is older than 1 hour.

## Tech Stack

- React 19
- Vite
- Zustand (state management)
- Zod (schema validation)
- Motion (animations)

## License

MIT
