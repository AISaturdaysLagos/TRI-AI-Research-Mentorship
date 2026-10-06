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

`.env.development` sets `VITE_ENABLE_FIXTURES=true` and `VITE_USE_EMULATORS=true`. Vite loads that file for `npm run dev` only, so the dev app uses the local Auth and Firestore emulators. The GitHub Pages build sets `VITE_ENABLE_FIXTURES=true` and leaves the emulator flag unset, so the published site uses the demo Firebase project `tri-ai-research-demo`.

## Local development

Use three terminals.

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

One TRI AI Saturdays Award can include several researchers. A researcher belongs to only one TRI AI Saturdays Award project. A project can include several Senior Researchers, and a Senior Researcher can be on more than one project.

- http://localhost:5173/#/award/saturdays-sample is the one TRI AI Saturdays Award for Ada, Chidi, and Amina.
- That award project lists those three researchers, with Kwame and Zainab as Senior Researchers.
- Kwame is also on the Hausa project with Zainab, and on the published Yoruba project with Ifeoma.
- An admin can copy an invite link from Projects. http://localhost:5173/#/join/join-flood-researcher adds a Researcher to the flood project. http://localhost:5173/#/join/join-flood-senior adds a Senior Researcher. Joining is their choice. A researcher who already belongs to that TRI AI Saturdays Award project is not added to a second one.

## GitHub Pages demo

The published site uses Firebase project `tri-ai-research-demo`. The same demo accounts and records are loaded there with `npm run seed:demo`. Sign-in, projects, meetings, and tasks run against that project. Creating or updating a Google Doc still needs the local Drive sync.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server, with local fixtures when `.env.development` is present |
| `npm run emulators` | Firebase Auth and Firestore emulators |
| `npm run seed:fixtures` | Create the local test accounts and sample records |
| `npm run seed:demo` | Load those same accounts and records into the demo Firebase project |
| `npm run build` | Typecheck and production build into `dist` |
| `npm run preview` | Serve the production build locally |
