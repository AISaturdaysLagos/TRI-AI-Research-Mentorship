import { fixturesEnabled } from "./firebase";

export const programmeUrl = "https://aisaturdayslagos.github.io/TRI-AI-Research-Mentorship/";
export const demoUrl = "https://tri-ai-research-mentorship.web.app/";

/** The hosted demo build. Local emulator sessions keep the ordinary dev chrome. */
export const hostedDemo = fixturesEnabled && import.meta.env.VITE_USE_EMULATORS !== "true";
