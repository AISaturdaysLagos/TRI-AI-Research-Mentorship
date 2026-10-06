export type ProjectDriveFile = {
  id: string;
  name: string;
  url: string;
  kind: "folder" | "document";
};

export type ProjectDrive = {
  id: string;
  name: string;
  url: string;
  files: ProjectDriveFile[];
};

function folder(id: string, name: string): ProjectDriveFile {
  return { id, name, url: `https://drive.google.com/drive/folders/${id}`, kind: "folder" };
}

function document(id: string, name: string): ProjectDriveFile {
  return { id, name, url: `https://docs.google.com/document/d/${id}/edit`, kind: "document" };
}

const drives: Record<string, ProjectDrive> = {
  "fixture-flood-project": {
    id: "1YyFR_aH_we5652FTiRDfonvXThqVIBmv",
    name: "Flood mapping from satellite imagery",
    url: "https://drive.google.com/drive/folders/1YyFR_aH_we5652FTiRDfonvXThqVIBmv",
    files: [
      folder("11pIsxOiU6vCsCCo4lYebAUVbtho2Vo9n", "Ada Okonkwo — Researcher"),
      folder("1tXIlNdtH8BM_nAbuH7yvAU6leVhjnu0f", "Amina Yusuf — Researcher"),
      folder("1CVN8UBZaHEwfn0o51uTvXMZhhgvIHTFN", "Chidi Okeke — Researcher"),
      folder("19v1fu5jJCDiBTZeFBgHO7KNXeG3NI5Fi", "Kwame Mensah — Senior Researcher"),
      folder("164iqj7nZqI89X7sBnBaUxAcwSRllcWJp", "Zainab Ibrahim — Senior Researcher"),
      document("1uzL2inAf6zwNNrohn_CudgEpnmQdV-UdIUgYF3CeeZ4", "Milestone — Collect ground reports for one flood event"),
      document("19OZCE6QC0u2x--Hu0Nda1ZMiC2tf-bK1nu3P33FmUsU", "Output — Lagos flood-street comparison"),
      document("1Corbps7MuNUB_5cqsKrk8o-OdhSskym83JjSpv1eE7M", "Progress update — October 2026"),
      document("1L879nNlUpQK-6qsSi_9CC7bGGerrtvTvHE29XAOV1Dc", "Project Charter"),
      document("1dn1gylSP1bT37ljP7J6fwhakpkin-w9qmKe9IZu9XVc", "Resource request — Data"),
      folder("1SC40K6EnThsjdc-CSrtYYc4L0qiW9i3s", "Seyi Okonkwo — Researcher"),
      document("1CIdO-o7U-Ymnv7jOMTRF6czjHD5IZpp14thD54ptrvw", "Project overview"),
      document("1AJ32ZT0hOMplcxAElG6UCo0kTOfpikksI_KKpoHZASo", "Scoping notes"),
    ],
  },
  "fixture-hausa-pilot": {
    id: "1ToysTI_lsHfQhKXrij-ISCTFJoBt0y59",
    name: "Evaluating translation models for Hausa health information",
    url: "https://drive.google.com/drive/folders/1ToysTI_lsHfQhKXrij-ISCTFJoBt0y59",
    files: [
      folder("1f3VZlEkDNcXLAXK4hsFs9I1qsJ2eXHgn", "Ada Okonkwo — Researcher"),
      folder("1PaqIYNXvZPy_KLDmxUfui3rkGD9Jrtp6", "Kwame Mensah — Senior Researcher"),
      folder("1kg6ki0Hge1cwJKfxafE37WpL1Sy56clE", "Zainab Ibrahim — Senior Researcher"),
      document("1uiMVsYEKjy5Ve87_a6Blen_uKKlDuGf_oYvh225VN90", "Milestone — Agree the health-phrase sample"),
      document("1mLWRi4_p4u1xzlWWha4wwXnHTia9Cd5BUv4TxYLDzY8", "Output — Hausa health error taxonomy"),
      document("1o6dd9Ieb8w445Y9IUbPDIxhlihFRnl-KgIFtVG1ZwoA", "Progress update — October 2026"),
      document("1R4lXsNmJqV4PU3JfLZT-X9dlPaFSBQ30dPwNgyvNhKw", "Project Charter"),
      document("1bXWV2dZ_M6Pnr_2d1jLzOx2WwtNvx-Wf8Cvl7MCltZo", "Resource request — Data"),
      document("1yXK_ZnA_ZQBPiofU85w-6nuehkZ32XsbjGsWcxzweEs", "Project overview"),
    ],
  },
  "fixture-yoruba-corpus": {
    id: "1adRqSMakM4uNTdKE9OWGpWXmziEzRHXP",
    name: "Open speech notes for Yoruba clinics",
    url: "https://drive.google.com/drive/folders/1adRqSMakM4uNTdKE9OWGpWXmziEzRHXP",
    files: [
      folder("1cJO8WbmPDwu1SstR5MsIMxVqdhuM2CMf", "Amina Yusuf — Researcher"),
      folder("1RmNT7a7lmF8FPBUDyikVBjkZ4JTl1op-", "Ifeoma Eze — Senior Researcher"),
      folder("1RW0mBE2T8o2YZe5Q0OZvQEI0vjBbPUnf", "Kwame Mensah — Senior Researcher"),
      document("1Cm_zgyPwHpCbw1cNQaB_P_AZjredjfJF0JcnvKzJE_4", "Milestone — Confirm consent on the phrase list"),
      document("19OS3cK8LXXe75_XmbG_e7HBlGXjd-SsDNoABevtWjV4", "Milestone — Draft the speech note"),
      document("1lB8aoRi-ZDkepTTJtX-PyNCj2D7wWYGLikK1e8IeCow", "Output — Consented Yoruba clinic phrases"),
      document("1VwYcRVEkyZmNqmUiOoV-xca-J_2f_mQCxXHhFjPIh_k", "Output — Open speech notes for Yoruba clinics"),
      document("18SONoIYhdjICITQQRQU5hNwj3gdHfZOeXpKVSE6Hc54", "Progress update — October 2026"),
      document("1kMP1nmlXgwPYAmX4qGG_fR1m0804HiSkfxpEGEnua1s", "Progress update — September 2026"),
      document("1_PeiqgDymu3AF1CdXLNLout2jLZ_5aOJwPsKoV-Xogo", "Project Charter"),
      document("1Q4b-4jPc7Jm9lVTY1ie3eO5g9dp5fHan5Qt_PGXuGWE", "Resource request — Compute"),
      document("17dVeSiuZHfebIdC6eW1Kb_-VXOC9j05OZH798lhI0GU", "Resource request — Data"),
      folder("1co3C3P8VTYVzkoovVN1fdthwVqnXBzOT", "Chidi Okeke — Researcher"),
      document("1pnuNod_Dip6-Cih1JMzSDTwxqJFwcZqADrEHHqW5wZI", "Project overview"),
    ],
  },
  "fixture-yoruba-speech": {
    id: "1f1l0iD1qUzansqaKTFrMOBs0SDLTaDK-",
    name: "Speech recognition for Yoruba clinical interviews",
    url: "https://drive.google.com/drive/folders/1f1l0iD1qUzansqaKTFrMOBs0SDLTaDK-",
    files: [
      folder("1bqs8znO2ndv_wbLyIrM6o_8htLwt-A_x", "Ada Okonkwo — Researcher"),
      folder("1qmjZsycwfUvs3si0iW9isQmYIXb-_kOT", "Kwame Mensah — Senior Researcher"),
      document("1oTlWItA30TFYXTTAlAYbzjLGyzJ_5Y_8-htQjTd0A_8", "Project overview"),
      document("17z8Eevk18ReSzPXXvX3hU1s7U8s3PitfvbDK15XyWnA", "Project Charter"),
    ],
  },
  LupWiQ9XzS1eAqZ6cGAn: {
    id: "1oR3tGg2dtPkDW-8tVAPthJVygCQCf8_Q",
    name: "Clinic notes for Igbo maternal health",
    url: "https://drive.google.com/drive/folders/1oR3tGg2dtPkDW-8tVAPthJVygCQCf8_Q",
    files: [
      folder("1mKn_upHv2EsTyCxY_J6wkHFfLDIug2cI", "Ngozi Adeyemi — Researcher"),
      folder("1XfgS6z0ZocH_Ls16qGSrkKCgHWoylRin", "test — Researcher"),
      folder("1bek4f4hbYdbj9dqEeHnimK8XATIUSiS8", "Tunde Balogun — Senior Researcher"),
      document("1OUFiBjePG-703Hs1wQoj1dn9LN87v4GWiroAium-fHo", "Project overview"),
      document("13cK7qYgWw5ZQ0ZwtQTbSVUADc19xlFbUONvIR7m11o0", "Project Charter"),
      document("18DTLufzsegRGW7iUX8CdosOwCtdgnr8r2X1EmMK9dUA", "Scoping notes"),
    ],
  },
  MN4wsDxF21LBH4cWbZCR: {
    id: "1xidp22lUisFUCcjvC18BHbRnUNxkHc-z",
    name: "Test Title",
    url: "https://drive.google.com/drive/folders/1xidp22lUisFUCcjvC18BHbRnUNxkHc-z",
    files: [
      folder("1stEXK-Q0H8QV9rxgZ3lQVTCSSELJtHxj", "John Doe — Researcher"),
      folder("1tLEmT2uB_YAlZZy1lG8T6_0hXRdHqec2", "Senior Doe — Senior Researcher"),
      document("1g1-piYDI46u6NC8SVUUVX9RPY9v0gijh7oI2Rcbzs6g", "Project overview"),
      document("1CndiIk9U5xMD4rRGIJ24B0hP_jFZwXg3z_6DHG9o-2Y", "Project Charter"),
      document("1CBA_ht5EZ3RuTGae_PY87MHFOKuG6bGhl--GDOO3Uag", "Scoping notes"),
    ],
  },
};

export const PROGRAMME_RETURNS_FOLDER_ID = "1wa39VNAlKAzEqAi_douXgDdIJnkQ1MfQ";

const overlays = new Map<string, ProjectDriveFile[]>();

export function personFolderName(name: string, role: "Researcher" | "Senior Researcher") {
  return `${name.trim()} — ${role}`;
}

export function rememberDriveFiles(projectId: string, files: ProjectDriveFile[]) {
  const current = overlays.get(projectId) ?? [];
  const byName = new Map(current.map((file) => [file.name, file]));
  for (const file of files) {
    if (file.id && file.name) byName.set(file.name, file);
  }
  overlays.set(projectId, [...byName.values()]);
}

export function projectDrive(projectId: string) {
  const base = drives[projectId];
  const extra = overlays.get(projectId) ?? [];
  if (!base && extra.length === 0) return null;
  const byName = new Map<string, ProjectDriveFile>();
  for (const file of base?.files ?? []) byName.set(file.name, file);
  for (const file of extra) byName.set(file.name, file);
  const id = base?.id || "";
  if (!id) return null;
  return {
    id,
    name: base?.name || "Project",
    url: base?.url || `https://drive.google.com/drive/folders/${id}`,
    files: [...byName.values()],
  };
}

export function rememberProjectFolder(projectId: string, folder: { id: string; name: string; url: string }, files: ProjectDriveFile[]) {
  const current = drives[projectId];
  const byName = new Map<string, ProjectDriveFile>();
  for (const file of current?.files ?? []) byName.set(file.name, file);
  for (const file of files) if (file.id && file.name) byName.set(file.name, file);
  drives[projectId] = {
    id: folder.id || current?.id || "",
    name: folder.name || current?.name || "Project",
    url: folder.url || current?.url || `https://drive.google.com/drive/folders/${folder.id || current?.id || ""}`,
    files: [...byName.values()],
  };
  rememberDriveFiles(projectId, files);
}
