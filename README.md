# TRI AI Research Programme

Public programme site and lightweight research workspace for the TRI AI Researcher and Senior Researcher Programme. The app is React, TypeScript, and Vite. Sign-in uses Firebase Authentication, records live in Cloud Firestore, and files stay in Google Drive. GitHub Pages serves the production build.

## Prerequisites

- Node.js 22
- Java, required by the Firestore emulator. If `JAVA_HOME` is unset, `npm run emulators` uses Homebrew OpenJDK at `/opt/homebrew/opt/openjdk` when that directory exists.

## Setup

```bash
npm install
cp .env.example .env
```

Fill the four `VITE_FIREBASE_*` values in `.env` from the Firebase web app config. Those values are public; Firestore Security Rules enforce access. `.env` is gitignored.

`.env.development` sets `VITE_ENABLE_FIXTURES=true` and `VITE_USE_EMULATORS=true`. Vite loads that file for `npm run dev` only, so the dev app uses the local Auth and Firestore emulators. GitHub Pages leaves fixtures off and uses the live Firebase project. The hosted demo is a separate build with fixtures on.

## Local development

Start the emulators, load the demo accounts, and open the app in one step:

```bash
npm run dev:start
```

The app is usually at http://localhost:5173/#/login. The Emulator UI is at http://127.0.0.1:4000. Ctrl+C stops Vite and the emulators this command started. If both emulators are already running, the command reuses them and only reloads the fixture data. It points the dev server at the local emulator project `tri-ai-research-mentorship`. Missing `node_modules` triggers `npm install`. Empty Firebase web config falls back to public demo values, which the emulators accept.

Or use three terminals.

1. Start the emulators and leave the process running:

```bash
npm run emulators
```

Auth listens on port 9099, Firestore on port 8080, and the Emulator UI is at http://127.0.0.1:4000.

2. Seed local accounts and records:

```bash
npm run seed:fixtures
```

Run this again after emulator data is cleared.

3. Start the app:

```bash
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173/#/login. The **Demo accounts** buttons sign in against the emulators. The shared password is `fixture-pass`.

| Role | Email |
| --- | --- |
| Researcher | ada.researcher@example.com |
| Researcher | chidi.researcher@example.com |
| Researcher | amina.researcher@example.com |
| Senior Researcher | kwame.senior@example.com |
| Senior Researcher | zainab.senior@example.com |
| Senior Researcher | ifeoma.senior@example.com |
| Reviewer | nia.reviewer@example.com |
| Admin | tri.admin@example.com |

One TRI AI Saturdays Research Award can include several researchers. A researcher belongs to only one TRI AI Saturdays Research Award project. A project can include several Senior Researchers, and a Senior Researcher can be on more than one project.

- http://localhost:5173/#/award/saturdays-sample is the one TRI AI Saturdays Research Award for Ada, Chidi, and Amina.
- That award project lists those three researchers, with Kwame and Zainab as Senior Researchers.
- Kwame is also on the Hausa project with Zainab, and on the published Yoruba project with Ifeoma.
- An admin can copy an invite link from Projects. http://localhost:5173/#/join/join-flood-researcher adds a Researcher to the flood project. http://localhost:5173/#/join/join-flood-senior adds a Senior Researcher. Joining is their choice. A researcher who already belongs to that TRI AI Saturdays Research Award project is not added to a second one.

## Live programme and demo

The live programme is https://aisaturdayslagos.github.io/TRI-AI-Research-Mentorship/. Sign-in is Google or email. Sample accounts are not on that site. Its Firebase project is `tri-ai-research-demo`, which already holds the programme records.

The programme demo is https://tri-ai-research-mentorship.web.app/. It has the sample accounts and sample projects, in its own Firebase project, so a demo sign-in cannot change the live programme. Load or restore those records with `npm run seed:demo`. Publish a new demo build with `npm run deploy:demo` while logged in to Firebase.

Creating or updating Google Docs on GitHub Pages uses the signed-in Google account (Drive and Docs APIs). Sign in with Google, not only a fixture email/password account. That Google account needs Editor access on the programme Drive folder. Locally, `npm run drive-sync` remains available as a development fallback.

## E2E tests

Playwright covers the public pages, each role’s seeded screens, and a few write chains (proposal matching, project work, invite join). Tests use the Auth and Firestore emulators. Creating a Google Doc is out of scope.

After `npm install`, Chromium is installed for Playwright. If browsers are missing, run `npx playwright install chromium`.

With emulators already running:

```bash
npm run seed:fixtures
npm run test:e2e
```

Or start emulators, seed, and run in one step (ports 9099 and 8080 must be free):

```bash
npm run test:e2e:ci
```

GitHub Actions runs `test:e2e:ci` on pull requests and pushes to `main`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev:start` | Emulators, fixture seed, and the Vite dev server |
| `npm run dev` | Vite dev server, with local fixtures when `.env.development` is present |
| `npm run emulators` | Firebase Auth and Firestore emulators |
| `npm run seed:fixtures` | Create the local test accounts and sample records |
| `npm run seed:demo` | Load the sample accounts and records into the hosted demo |
| `npm run deploy:demo` | Build the demo and publish it to Firebase Hosting |
| `npm run test:e2e` | Run Playwright against the local app (expects emulators) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:ci` | Emulators, seed, then Playwright |
| `npm run build` | Typecheck and production build into `dist` |
| `npm run preview` | Serve the production build locally |
