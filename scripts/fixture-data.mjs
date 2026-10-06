import { fixtureAccounts } from "./fixture-accounts.mjs";

const proposalDefaults = {
  name: "",
  affiliation: "University of Lagos",
  location: "Lagos, Nigeria",
  applicantStatus: "PhD student",
  bio: "Machine learning for African languages and public-interest datasets.",
  github: "https://github.com/example/research",
  scholar: "",
  title: "",
  researchArea: "",
  africaRelevance: "",
  summary: "",
  problem: "",
  question: "",
  relatedWork: "Prior systems are trained mostly on high-resource languages.",
  methodology: "",
  data: "",
  evaluation: "",
  contribution: "",
  readiness: "Coursework in machine learning and a pilot annotation study.",
  mentorExpertise: "",
  resources: "Modest GPU time for fine-tuning and evaluation.",
  timeline: "4 months",
  intendedOutput: "A technical report and a reproducible evaluation.",
  risks: "Data access may take longer than planned.",
  links: "",
  fixture: true,
};

function proposal(overrides) {
  return { ...proposalDefaults, ...overrides };
}

function person(uid, name) {
  return { uid, name };
}

function names(people) {
  return people.map((item) => item.name).join(", ");
}

function assertResearchers(documents) {
  for (const document of documents) {
    if (document.path.startsWith("proposals/") && !document.data.ownerId) {
      throw new Error(`${document.path} has no researcher.`);
    }
    const projectRecord = document.path.startsWith("projects/") && document.path.split("/").length === 2;
    if (projectRecord && !(document.data.researchers ?? []).some((person) => person.uid && person.name)) {
      throw new Error(`${document.path} has no researcher.`);
    }
  }
}

function assertWorkspace(documents) {
  const pieces = ["charter/current", "updates/", "milestones/", "resources/", "outputs/"];
  for (const projectId of ["fixture-flood-project", "fixture-hausa-pilot", "fixture-yoruba-corpus"]) {
    for (const piece of pieces) {
      const found = documents.some((document) => document.path.startsWith(`projects/${projectId}/${piece}`));
      if (!found) throw new Error(`${projectId} is missing ${piece}`);
    }
  }
}

function assertOneAwardProject(documents) {
  const awardByResearcher = new Map();
  const projectByResearcher = new Map();
  for (const document of documents) {
    if (document.path.startsWith("awards/")) {
      for (const person of document.data.recipients ?? []) {
        if (awardByResearcher.has(person.uid)) {
          throw new Error(`${person.name} is on more than one TRI AI Saturdays Award.`);
        }
        awardByResearcher.set(person.uid, document.path);
      }
    }
    if (document.path.startsWith("projects/") && document.data.awardId) {
      for (const person of document.data.researchers ?? []) {
        if (projectByResearcher.has(person.uid)) {
          throw new Error(`${person.name} is on more than one TRI AI Saturdays Award project.`);
        }
        projectByResearcher.set(person.uid, document.path);
      }
    }
  }
}

export function buildFixtureDocuments(uids) {
  const researcher = uids.researcher;
  const chidi = uids.researcherChidi;
  const amina = uids.researcherAmina;
  const senior = uids.senior;
  const zainab = uids.seniorZainab;
  const ifeoma = uids.seniorIfeoma;
  const reviewer = uids.reviewer;
  const ada = person(researcher, "Ada Okonkwo");
  const chidiPerson = person(chidi, "Chidi Okeke");
  const aminaPerson = person(amina, "Amina Yusuf");
  const kwame = person(senior, "Kwame Mensah");
  const zainabPerson = person(zainab, "Zainab Ibrahim");
  const ifeomaPerson = person(ifeoma, "Ifeoma Eze");
  const floodTeam = [ada, chidiPerson, aminaPerson];
  const fit = {
    researchArea: 5,
    method: 4,
    interest: 4,
    availability: 5,
    complementarity: 4,
  };

  const documents = [
    ...fixtureAccounts.map((account) => ({
      path: `users/${uids[account.key]}`,
      data: {
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        fixture: true,
      },
    })),
    {
      path: `seniorResearcherProfiles/${senior}`,
      data: {
        name: "Kwame Mensah",
        affiliation: "University of Ghana",
        currentRole: "Senior lecturer",
        country: "Ghana",
        researchAreas: "machine translation, African languages, health communication",
        methods: "evaluation, datasets, error analysis",
        publications: "Hausa-English health translation benchmark, 2024.",
        capacity: "2",
        cadence: "Fortnightly",
        availability: "available",
        poolStatus: "in_pool",
        fixture: true,
      },
    },
    {
      path: `seniorResearcherProfiles/${zainab}`,
      data: {
        name: "Zainab Ibrahim",
        affiliation: "Ahmadu Bello University",
        currentRole: "Research fellow",
        country: "Nigeria",
        researchAreas: "earth observation, flood risk, satellite imagery",
        methods: "remote sensing, spatial validation",
        publications: "Open imagery for urban flood extent, 2023.",
        capacity: "2",
        cadence: "Monthly",
        availability: "limited_capacity",
        poolStatus: "in_pool",
        fixture: true,
      },
    },
    {
      path: `seniorResearcherProfiles/${ifeoma}`,
      data: {
        name: "Ifeoma Eze",
        affiliation: "University of Ibadan",
        currentRole: "Associate professor",
        country: "Nigeria",
        researchAreas: "speech recognition, clinical language, Yoruba",
        methods: "annotation, error analysis, evaluation sets",
        publications: "Clinical Yoruba speech notes, 2025.",
        capacity: "1",
        cadence: "Monthly",
        availability: "available",
        poolStatus: "in_pool",
        fixture: true,
      },
    },
    {
      path: "proposals/fixture-yoruba-speech",
      data: proposal({
        ownerId: researcher,
        route: "direct",
        status: "received",
        name: "Ada Okonkwo",
        title: "Speech recognition for Yoruba clinical interviews",
        researchArea: "speech recognition",
        africaRelevance: "The interviews are collected in Lagos clinics and are in Yoruba.",
        summary:
          "Build and evaluate a speech model for short Yoruba clinical interviews, with a focus on names, symptoms, and follow-up instructions.",
        problem: "Clinic notes are often incomplete when the conversation is not in English.",
        question: "Can a compact model transcribe Yoruba clinical interviews well enough to support review?",
        methodology: "Fine-tune an open speech model and compare it with a general multilingual baseline.",
        data: "A consented pilot set is recorded. Full clinic access is still being agreed.",
        evaluation: "Word error rate on a held-out clinic set, plus a clinician review of 30 transcripts.",
        contribution: "A documented evaluation set and an error analysis for clinical Yoruba.",
        mentorExpertise: "Speech datasets and evaluation design.",
      }),
    },
    {
      path: "proposals/fixture-crop-photos",
      data: proposal({
        ownerId: researcher,
        route: "direct",
        status: "revise",
        name: "Ada Okonkwo",
        title: "Crop disease detection from phone photos",
        researchArea: "computer vision",
        africaRelevance: "The photos come from smallholder maize fields in Oyo State.",
        summary: "Test whether phone photos can flag common maize diseases early enough to be useful.",
        problem: "Extension officers cannot visit every field during an outbreak.",
        question: "Which maize diseases can be distinguished from phone photos taken in the field?",
        methodology: "Train a classifier on labelled field photos and test it on a later season.",
        data: "About 2,000 labelled photos. The season split is not final.",
        evaluation: "Accuracy by disease, with a check against an extension officer.",
        contribution: "A field-tested error analysis, not a deployment claim.",
        mentorExpertise: "Dataset design for agricultural images.",
      }),
    },
    {
      path: "proposals/fixture-hausa-health",
      data: proposal({
        ownerId: researcher,
        route: "direct",
        status: "matching",
        name: "Ada Okonkwo",
        title: "Evaluating translation models for Hausa health information",
        researchArea: "machine translation",
        africaRelevance: "The texts are public health explanations that need a clear Hausa version.",
        summary:
          "Compare open translation models on short Hausa health texts and describe the errors that would matter to a reader.",
        problem: "Health explanations are often published in English first.",
        question: "Where do current models fail on Hausa health text, and are the failures systematic?",
        methodology: "Score translations with a bilingual reviewer and group the errors.",
        data: "Public health leaflets already cleared for research use.",
        evaluation: "Error categories agreed with a Hausa-speaking reviewer.",
        contribution: "An error taxonomy for Hausa health translation.",
        mentorExpertise: "Machine translation evaluation and health communication.",
      }),
    },
    {
      path: "proposals/fixture-flood-map",
      data: proposal({
        ownerId: researcher,
        researcherIds: floodTeam.map((item) => item.uid),
        route: "saturdays",
        status: "matching",
        name: names(floodTeam),
        title: "Flood mapping from satellite imagery",
        researchArea: "earth observation",
        africaRelevance: "The sites are flood-prone neighbourhoods in Lagos.",
        summary:
          "Turn an existing flood-mapping prototype from the TRI AI Saturdays Award into a research question about how well open satellite imagery marks flooded streets.",
        problem: "City teams need a faster view of which streets are under water.",
        question: "How reliably can open satellite imagery mark flooded streets in Lagos?",
        methodology: "Compare model maps with ground reports from two flood events.",
        data: "Sentinel imagery and a small set of ground reports.",
        evaluation: "Agreement with ground reports, reported by neighbourhood.",
        contribution: "A careful limit on what the map can and cannot claim.",
        mentorExpertise: "Remote sensing evaluation.",
      }),
    },
    {
      path: "proposals/fixture-under-review",
      data: proposal({
        ownerId: researcher,
        route: "direct",
        status: "under_review",
        name: "Ada Okonkwo",
        title: "A benchmark of African language tokenisers",
        researchArea: "natural language processing",
        africaRelevance: "The benchmark covers Yoruba, Hausa, Igbo, Swahili, and Amharic.",
        summary: "Measure how current tokenisers split five widely used African languages.",
        problem: "Poor tokenisation wastes the little labelled data that exists.",
        question: "Which tokenisers keep words and morphology intact for these languages?",
        methodology: "Run a shared set of texts through public tokenisers and compare fertility and splits.",
        data: "Public news and Wikipedia text.",
        evaluation: "Tokens per word, plus a manual check of 100 morphological splits.",
        contribution: "A small public benchmark and a written comparison.",
        mentorExpertise: "Tokenisation and African language NLP.",
      }),
    },
    {
      path: "reviews/fixture-under-review",
      data: {
        proposalId: "fixture-under-review",
        reviewerId: reviewer,
        problemImportance: 16,
        novelty: 14,
        methodology: 15,
        feasibility: 12,
        readiness: 11,
        outputPotential: 8,
        strengths: "The question is concrete and the data is already public.",
        concerns: "The manual check needs a named reviewer for each language.",
        mentorExpertise: "Tokenisation and evaluation.",
        note: "Worth a Senior Researcher if the language coverage stays limited to five.",
        flags: {
          ethics: false,
          dataRights: false,
          safety: false,
          compute: false,
          ownership: false,
          weakDesign: false,
        },
        decision: "under_review",
        fixture: true,
      },
    },
    {
      path: "matches/fixture-hausa-pending",
      data: {
        proposalId: "fixture-hausa-health",
        title: "Evaluating translation models for Hausa health information",
        summary:
          "Compare open translation models on short Hausa health texts and describe the errors that would matter to a reader.",
        question: "Where do current models fail on Hausa health text, and are the failures systematic?",
        researchArea: "machine translation",
        africaRelevance: "The texts are public health explanations that need a clear Hausa version.",
        contribution: "An error taxonomy for Hausa health translation.",
        researcherId: researcher,
        researcherName: "Ada Okonkwo",
        readiness: "Coursework in machine learning and a pilot annotation study.",
        methodology: "Score translations with a bilingual reviewer and group the errors.",
        data: "Public health leaflets already cleared for research use.",
        evaluation: "Error categories agreed with a Hausa-speaking reviewer.",
        timeline: "4 months",
        mentorNeed: "Machine translation evaluation and health communication.",
        mentorId: senior,
        mentorName: "Kwame Mensah",
        fit,
        fitScore: 22,
        note: "This looks close to your Hausa health translation work.",
        response: "pending",
        responseNote: "",
        introduced: false,
        fixture: true,
      },
    },
    {
      path: "matches/fixture-flood-interested",
      data: {
        proposalId: "fixture-flood-map",
        title: "Flood mapping from satellite imagery",
        summary:
          "Turn an existing flood-mapping prototype from the TRI AI Saturdays Award into a research question about how well open satellite imagery marks flooded streets.",
        question: "How reliably can open satellite imagery mark flooded streets in Lagos?",
        researchArea: "earth observation",
        africaRelevance: "The sites are flood-prone neighbourhoods in Lagos.",
        contribution: "A careful limit on what the map can and cannot claim.",
        researcherId: researcher,
        researcherIds: floodTeam.map((item) => item.uid),
        researcherName: names(floodTeam),
        readiness: "The TRI AI Saturdays Award team already built a flood-mapping prototype.",
        methodology: "Compare model maps with ground reports from two flood events.",
        data: "Sentinel imagery and a small set of ground reports.",
        evaluation: "Agreement with ground reports, reported by neighbourhood.",
        timeline: "4 months",
        mentorNeed: "Remote sensing evaluation.",
        mentorId: senior,
        mentorName: "Kwame Mensah",
        fit: { researchArea: 3, method: 3, interest: 4, availability: 5, complementarity: 3 },
        fitScore: 18,
        note: "Please say if the earth-observation method is close enough to your evaluation work.",
        response: "interested",
        responseNote: "I can review the evaluation design with Zainab if she takes the satellite methods.",
        introduced: false,
        fixture: true,
      },
    },
    {
      path: "matches/fixture-flood-zainab",
      data: {
        proposalId: "fixture-flood-map",
        title: "Flood mapping from satellite imagery",
        summary:
          "Turn an existing flood-mapping prototype from the TRI AI Saturdays Award into a research question about how well open satellite imagery marks flooded streets.",
        question: "How reliably can open satellite imagery mark flooded streets in Lagos?",
        researchArea: "earth observation",
        africaRelevance: "The sites are flood-prone neighbourhoods in Lagos.",
        contribution: "A careful limit on what the map can and cannot claim.",
        researcherId: researcher,
        researcherIds: floodTeam.map((item) => item.uid),
        researcherName: names(floodTeam),
        readiness: "The TRI AI Saturdays Award team already built a flood-mapping prototype.",
        methodology: "Compare model maps with ground reports from two flood events.",
        data: "Sentinel imagery and a small set of ground reports.",
        evaluation: "Agreement with ground reports, reported by neighbourhood.",
        timeline: "4 months",
        mentorNeed: "Remote sensing evaluation.",
        mentorId: zainab,
        mentorName: "Zainab Ibrahim",
        fit: { researchArea: 5, method: 5, interest: 4, availability: 3, complementarity: 5 },
        fitScore: 22,
        note: "Same TRI AI Saturdays Award as the request sent to Kwame. Two Senior Researchers can join one project.",
        response: "pending",
        responseNote: "",
        introduced: false,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-flood-project",
      data: {
        title: "Flood mapping from satellite imagery",
        summary:
          "The one TRI AI Saturdays Award project for Ada Okonkwo, Chidi Okeke, and Amina Yusuf.",
        researchArea: "earth observation",
        status: "scoping",
        health: "green",
        publicShowcase: false,
        question: "How reliably can open satellite imagery mark flooded streets in Lagos?",
        contribution: "A careful limit on what the map can and cannot claim.",
        year: "2026",
        proposalId: "fixture-flood-map",
        scoped: false,
        charterSigned: false,
        awardId: "saturdays-sample",
        driveFolderId: "1YyFR_aH_we5652FTiRDfonvXThqVIBmv",
        driveFolderUrl: "https://drive.google.com/drive/folders/1YyFR_aH_we5652FTiRDfonvXThqVIBmv",
        researchers: floodTeam,
        seniorResearchers: [kwame, zainabPerson],
        participantIds: [researcher, chidi, amina, senior, zainab],
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot",
      data: {
        title: "Evaluating translation models for Hausa health information",
        summary: "Ada Okonkwo's scoping project with Kwame Mensah and Zainab Ibrahim. It is not a TRI AI Saturdays Award project.",
        researchArea: "machine translation",
        status: "scoping",
        health: "green",
        publicShowcase: false,
        question: "Where do current models fail on Hausa health text, and are the failures systematic?",
        contribution: "An error taxonomy for Hausa health translation.",
        year: "2026",
        proposalId: "fixture-hausa-health",
        scoped: false,
        charterSigned: false,
        driveFolderId: "1ToysTI_lsHfQhKXrij-ISCTFJoBt0y59",
        driveFolderUrl: "https://drive.google.com/drive/folders/1ToysTI_lsHfQhKXrij-ISCTFJoBt0y59",
        researchers: [ada],
        seniorResearchers: [kwame, zainabPerson],
        participantIds: [researcher, senior, zainab],
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus",
      data: {
        title: "Open speech notes for Yoruba clinics",
        summary:
          "A published note on a small consented Yoruba speech set. Chidi Okeke is the Researcher. Kwame Mensah and Ifeoma Eze are the Senior Researchers.",
        researchArea: "speech recognition",
        status: "active",
        health: "amber",
        scoped: true,
        charterSigned: true,
        publicShowcase: true,
        driveFolderId: "1adRqSMakM4uNTdKE9OWGpWXmziEzRHXP",
        driveFolderUrl: "https://drive.google.com/drive/folders/1adRqSMakM4uNTdKE9OWGpWXmziEzRHXP",
        researchers: [chidiPerson],
        seniorResearchers: [kwame, ifeomaPerson],
        participantIds: [chidi, senior, ifeoma],
        question: "Which consented Yoruba clinic phrases are clear enough to publish as speech notes?",
        contribution: "A small public note on what the consented set can and cannot support.",
        year: "2026",
        fixture: true,
      },
    },
    {
      path: "awards/saturdays-sample",
      data: {
        recipientName: names(floodTeam),
        recipientIds: floodTeam.map((item) => item.uid),
        recipients: floodTeam,
        projectId: "fixture-flood-project",
        researchers: floodTeam.map((item) => ({ name: item.name })),
        seniorResearchers: [kwame, zainabPerson].map((item) => ({ name: item.name })),
        summary: "",
        question: "",
        timeline: "",
        title: "Flood mapping from satellite imagery",
        note: "",
        status: "matching",
        fixture: true,
      },
    },
  ];
  for (const member of floodTeam) {
    documents.push({
      path: `researcherAwardProjects/${member.uid}`,
      data: { projectId: "fixture-flood-project" },
    });
  }
  documents.push(
    {
      path: "projectInvites/join-flood-researcher",
      data: {
        projectId: "fixture-flood-project",
        projectTitle: "Flood mapping from satellite imagery",
        role: "researcher",
        status: "open",
        awardId: "saturdays-sample",
        acceptedIds: [],
        fixture: true,
      },
    },
    {
      path: "projectInvites/join-flood-senior",
      data: {
        projectId: "fixture-flood-project",
        projectTitle: "Flood mapping from satellite imagery",
        role: "senior_researcher",
        status: "open",
        awardId: "saturdays-sample",
        acceptedIds: [],
        fixture: true,
      },
    },
  );
  documents.push(
    {
      path: "projects/fixture-flood-project/charter/current",
      data: {
        scope: "Test how well open satellite imagery marks flooded streets in Lagos.",
        roles: "Ada Okonkwo, Chidi Okeke, and Amina Yusuf share the work. Kwame Mensah and Zainab Ibrahim review the comparison.",
        cadence: "Monthly",
        resources: "Open Sentinel imagery. No extra compute yet.",
        integrity: "Ground reports stay with the neighbourhood labels agreed for this TRI AI Saturdays Award.",
        authorship: "The three researchers share authorship. The Senior Researchers are acknowledged.",
        release: "Maps stay internal until TRI AI marks an output publishable.",
        updatedBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-flood-project/milestones/reports",
      data: {
        title: "Collect ground reports for one flood event",
        ownerName: "Amina Yusuf",
        due: "2026-11-30",
        status: "open",
        evidence: "",
        createdBy: amina,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-flood-project/updates/2026-10",
      data: {
        period: "October 2026",
        changes: "The award team listed the two flood events to compare.",
        evidence: "",
        blockers: "Ground reports for the second event are not in hand.",
        nextStep: "Amina Yusuf collects the first set of ground reports.",
        triAction: "",
        createdBy: amina,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-flood-project/resources/scenes",
      data: {
        type: "data",
        request: "Sentinel scenes and the matching ground reports for the first flood event.",
        status: "partial",
        limits: "Open Sentinel scenes for the first flood event only.",
        createdBy: zainab,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-flood-project/outputs/comparison",
      data: {
        type: "software",
        title: "Lagos flood-street comparison",
        status: "planned",
        link: "",
        venue: "",
        year: "2026",
        public: false,
        createdBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot/charter/current",
      data: {
        scope: "Compare open models on short Hausa health texts and group the errors a reader would notice.",
        roles: "Ada Okonkwo prepares the texts. Kwame Mensah and Zainab Ibrahim review the error groups.",
        cadence: "Fortnightly during scoping.",
        resources: "No extra compute. The leaflets are already public.",
        integrity: "Use only leaflets cleared for research.",
        authorship: "Ada Okonkwo is the author. The Senior Researchers are acknowledged.",
        release: "Nothing is public until TRI AI marks an output publishable.",
        updatedBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot/milestones/sample",
      data: {
        title: "Agree the health-phrase sample",
        ownerName: "Ada Okonkwo",
        due: "2026-11-01",
        status: "open",
        evidence: "",
        createdBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot/updates/2026-10",
      data: {
        period: "October 2026",
        changes: "The leaflet sample is chosen. Error categories are not agreed yet.",
        evidence: "Public health leaflets cleared for research use.",
        blockers: "A Hausa-speaking reviewer is not booked.",
        nextStep: "Kwame Mensah confirms the error categories.",
        triAction: "TRI AI can introduce the reviewer if the project asks.",
        createdBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot/resources/leaflets",
      data: {
        type: "data",
        request: "The cleared Hausa health leaflets, with the English source beside each one.",
        status: "requested",
        limits: "",
        createdBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-hausa-pilot/outputs/taxonomy",
      data: {
        type: "report",
        title: "Hausa health error taxonomy",
        status: "planned",
        link: "",
        venue: "",
        year: "2026",
        public: false,
        createdBy: researcher,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/charter/current",
      data: {
        scope: "Publish a short note on the consented Yoruba clinic phrases.",
        roles: "Chidi Okeke writes the note. Kwame Mensah and Ifeoma Eze review it.",
        cadence: "Monthly",
        resources: "No extra compute.",
        integrity: "Only phrases with recorded consent are included.",
        authorship: "Chidi Okeke is the author. The Senior Researchers are acknowledged.",
        release: "The note can be public once TRI AI marks the output publishable.",
        updatedBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/milestones/consent",
      data: {
        title: "Confirm consent on the phrase list",
        ownerName: "Chidi Okeke",
        due: "2026-10-01",
        status: "done",
        evidence: "https://tri-ai.org",
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/milestones/notes",
      data: {
        title: "Draft the speech note",
        ownerName: "Chidi Okeke",
        due: "2026-11-15",
        status: "open",
        evidence: "",
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/updates/2026-09",
      data: {
        period: "September 2026",
        changes: "Consent was checked on the first phrase list.",
        evidence: "The consent notes are with the project.",
        blockers: "A few phrases still need a second listener.",
        nextStep: "Draft the public note.",
        triAction: "",
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/updates/2026-10",
      data: {
        period: "October 2026",
        changes: "The consented phrase list is drafted.",
        evidence: "",
        blockers: "",
        nextStep: "Ifeoma Eze reviews the note.",
        triAction: "",
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/resources/annotation",
      data: {
        type: "compute",
        request: "A small annotation pass on the consented phrases.",
        status: "approved",
        limits: "One annotation pass, no extra compute.",
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/resources/listener",
      data: {
        type: "data",
        request: "A second listener for the phrases that are still unclear.",
        status: "requested",
        limits: "",
        createdBy: ifeoma,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/outputs/note",
      data: {
        type: "report",
        title: "Open speech notes for Yoruba clinics",
        status: "published",
        link: "https://tri-ai.org",
        venue: "TRI AI",
        year: "2026",
        public: true,
        createdBy: chidi,
        fixture: true,
      },
    },
    {
      path: "projects/fixture-yoruba-corpus/outputs/phrases",
      data: {
        type: "dataset",
        title: "Consented Yoruba clinic phrases",
        status: "drafting",
        link: "",
        venue: "",
        year: "2026",
        public: false,
        createdBy: chidi,
        fixture: true,
      },
    },
  );
  assertResearchers(documents);
  assertOneAwardProject(documents);
  assertWorkspace(documents);
  return documents;
}
