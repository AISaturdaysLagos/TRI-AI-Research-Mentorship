export type ReturnFolder = {
  uid: string;
  name: string;
  role: "Researcher" | "Senior Researcher";
  email: string;
  url: string;
};

const ada = {
  uid: "oElvXFwNtw1Ot3xAePsJ4fLilNhP",
  name: "Ada Okonkwo",
  role: "Researcher" as const,
  email: "ada.researcher@example.com",
};
const chidi = {
  uid: "wiRQaHwZDF2mNNxAczoMJfyN6fuS",
  name: "Chidi Okeke",
  role: "Researcher" as const,
  email: "chidi.researcher@example.com",
};
const amina = {
  uid: "lMjDMa1iB1k6EFoWcgk8OpTFlN9t",
  name: "Amina Yusuf",
  role: "Researcher" as const,
  email: "amina.researcher@example.com",
};
const kwame = {
  uid: "rkoNETUiOqPufhXEMwSHilr38vsX",
  name: "Kwame Mensah",
  role: "Senior Researcher" as const,
  email: "kwame.senior@example.com",
};
const zainab = {
  uid: "gnK1CVoGK8wPbnxWvAifaADSE4qg",
  name: "Zainab Ibrahim",
  role: "Senior Researcher" as const,
  email: "zainab.senior@example.com",
};
const ifeoma = {
  uid: "gHxjjbRj4dNkhz0Rl5cYKQABzFcv",
  name: "Ifeoma Eze",
  role: "Senior Researcher" as const,
  email: "ifeoma.senior@example.com",
};

function party(person: Omit<ReturnFolder, "url">, url: string): ReturnFolder {
  return { ...person, url };
}

const crop: ReturnFolder[] = [
  party(ada, "https://drive.google.com/drive/folders/1H_UG_-t746_f4367xnVxBRk9fO5aZQfY"),
  party(ifeoma, "https://drive.google.com/drive/folders/1N7mHriORzxXqSCSbOdn5G6fcnM60xqEl"),
];

const flood: ReturnFolder[] = [
  party(ada, "https://drive.google.com/drive/folders/11pIsxOiU6vCsCCo4lYebAUVbtho2Vo9n"),
  party(chidi, "https://drive.google.com/drive/folders/1CVN8UBZaHEwfn0o51uTvXMZhhgvIHTFN"),
  party(amina, "https://drive.google.com/drive/folders/1tXIlNdtH8BM_nAbuH7yvAU6leVhjnu0f"),
  party(kwame, "https://drive.google.com/drive/folders/19v1fu5jJCDiBTZeFBgHO7KNXeG3NI5Fi"),
  party(zainab, "https://drive.google.com/drive/folders/164iqj7nZqI89X7sBnBaUxAcwSRllcWJp"),
];

const hausa: ReturnFolder[] = [
  party(ada, "https://drive.google.com/drive/folders/1f3VZlEkDNcXLAXK4hsFs9I1qsJ2eXHgn"),
  party(kwame, "https://drive.google.com/drive/folders/1PaqIYNXvZPy_KLDmxUfui3rkGD9Jrtp6"),
  party(zainab, "https://drive.google.com/drive/folders/1kg6ki0Hge1cwJKfxafE37WpL1Sy56clE"),
];

const yorubaCorpus: ReturnFolder[] = [
  party(amina, "https://drive.google.com/drive/folders/1cJO8WbmPDwu1SstR5MsIMxVqdhuM2CMf"),
  party(kwame, "https://drive.google.com/drive/folders/1RW0mBE2T8o2YZe5Q0OZvQEI0vjBbPUnf"),
  party(ifeoma, "https://drive.google.com/drive/folders/1RmNT7a7lmF8FPBUDyikVBjkZ4JTl1op-"),
];

const tokenisers: ReturnFolder[] = [
  party(ada, "https://drive.google.com/drive/folders/1UNGeVJFBwRPDTjjWs9RwdmQCJWVACBoo"),
];

const yorubaSpeech: ReturnFolder[] = [
  party(ada, "https://drive.google.com/drive/folders/1bqs8znO2ndv_wbLyIrM6o_8htLwt-A_x"),
];

const byRecord: Record<string, ReturnFolder[]> = {
  "fixture-crop-photos": crop,
  "fixture-flood-project": flood,
  "fixture-flood-map": flood,
  "fixture-hausa-pilot": hausa,
  "fixture-hausa-health": hausa,
  "fixture-yoruba-corpus": yorubaCorpus,
  "fixture-under-review": tokenisers,
  "fixture-yoruba-speech": yorubaSpeech,
};

export function returnFoldersFor(recordId: string) {
  return byRecord[recordId] ?? [];
}
