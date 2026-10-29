# TRI AI Research Programme demo

Use the programme demo: https://tri-ai-research-mentorship.web.app/

Sign in from https://tri-ai-research-mentorship.web.app/#/login. The **Demo accounts** buttons are on that page. Every account uses the password `fixture-pass`. The live programme is separate: https://aisaturdayslagos.github.io/TRI-AI-Research-Mentorship/

Sign out from **Account** before switching roles. The records below are already loaded. Click through them. Creating a proposal, joining an invite, or saving a meeting writes to the shared demo.

To restore the records after a live edit, run `npm run seed:demo` from this repo while logged in to Firebase.

## Accounts

| Button | Person | Use them to show |
| --- | --- | --- |
| Researcher · Ada | Ada Okonkwo | The researcher home, the TRI AI Saturdays Research Award, and a project in scoping |
| Researcher · Chidi | Chidi Okeke | The same award project from a second researcher |
| Senior · Kwame | Kwame Mensah | A match request waiting for a reply, and projects he has already joined |
| Reviewer | Nia Adeyemi | A scored proposal still under review |
| Admin | TRI AI Admin | Tasks, matching, invites, the Senior Researcher pool, and reports |

## 10-minute path

1. Public pages, signed out.
2. Ada’s dashboard and the flood project Work page.
3. Kwame’s match request.
4. Admin tasks, then the public research page.

## 1. Public programme

Stay signed out.

| Open | Show |
| --- | --- |
| `#/` | Two ways in: a proposal, or a TRI AI Saturdays Research Award. |
| `#/how-it-works` | The path from an idea to a project with a Senior Researcher. |
| `#/researchers` | What a Researcher does. |
| `#/senior-researchers` | Senior Researcher acceptance is voluntary. |
| `#/research` | Current projects, plus the published note **Open speech notes for Yoruba clinics**. |
| `#/apply/researcher` | The proposal form. Leave it without submitting. |

Say: “The public site explains the programme. The workspace behind sign-in is where the work is tracked.”

## 2. Researcher

Sign in as **Researcher · Ada**.

`#/dashboard` opens on **Projects**.

- The notices name work already in motion: flood mapping and Hausa health are in scoping, the crop proposal needs a revision, the tokeniser proposal is under review, and the Yoruba speech proposal has been received.
- **TRI AI Saturdays Research Awards** shows **Flood mapping from satellite imagery** with Ada, Chidi, and Amina, and Senior Researchers Kwame and Zainab. **Open this invite** goes to `#/award/saturdays-sample`.
- Under **Projects**, open **Flood mapping from satellite imagery**.
- On another project card, open **Email TRI AI** and then **Message**. The draft is in Ada’s voice: “I have uploaded the Project Charter…”

On the flood project, `#/dashboard/projects/fixture-flood-project`, the page opens on **Work**.

| Panel | What is already there |
| --- | --- |
| Work | The task and meeting board for people on the project. |
| Overview | The question: how reliably open satellite imagery can mark flooded streets in Lagos. |
| Charter | The charter is not signed yet. |
| Milestones | **Collect ground reports for one flood event**, still open. |
| Progress | The October update. |
| Resources | A data request that is partly approved. |
| Outputs | **Lagos flood-street comparison**, still planned. |
| Drive | The project folder link. |

Open **Proposals** (`#/dashboard?tab=records`) to show the same person’s proposals at different stages. The crop proposal has a revision email ready.

Sign out. If you want a second researcher, sign in as **Researcher · Chidi**. He is on the same TRI AI Saturdays Research Award project, not a second one.

## 3. Senior Researcher

Sign in as **Senior · Kwame**.

`#/dashboard?tab=records` is **Opportunities**.

- **Evaluating translation models for Hausa health information** is waiting for Kwame. The fit note is on the card. Leave the response unsent so the next demo still has a pending request.
- **Flood mapping from satellite imagery** already shows his interest. Zainab’s request on that project is still pending, which is why the project can have more than one Senior Researcher.

**Projects** shows the flood project and the Hausa project. Open the Hausa project and show **Resources**: the leaflet request is still **requested**. That same request appears in the admin task list.

Kwame is also a Senior Researcher on the active Yoruba project with Ifeoma. Open `#/dashboard/projects/fixture-yoruba-corpus` and show **Outputs**: **Open speech notes for Yoruba clinics** is published, and **Consented Yoruba clinic phrases** is still drafting.

## 4. Reviewer

Sign in as **Reviewer**.

`#/admin/proposals` lists the pipeline. Open **A benchmark of African language tokenisers**.

The review is already scored out of 100: Problem Importance 16, Novelty 14, Methodology 15, Feasibility 12, Researcher Readiness 11, Output Potential 8. The decision is still **Under review**. Nia can see the review. She does not get the admin task list or the meeting desk.

## 5. Admin

Sign in as **Admin**.

| Open | Show |
| --- | --- |
| `#/admin/tasks` | Open work for TRI AI: the Hausa data request, open milestones, progress updates, and outputs that are not public. |
| `#/admin/proposals` | Received, under review, revise, and ready for matching. |
| `#/admin/matching` | Kwame interested in flood mapping. The Hausa request and Zainab’s flood request are still waiting. |
| `#/admin/projects` | Scoping and active projects. Copy an invite from the flood project. |
| `#/admin/mentors` | Kwame, Zainab, and Ifeoma are in the Senior Researcher pool. |
| `#/admin/reports` | Live counts and the CSV export. |

The researcher invite is `#/join/join-flood-researcher`. The Senior Researcher invite is `#/join/join-flood-senior`. Open one while signed out and show that joining is a choice. Do not complete it during the demo. Ada, Chidi, and Amina already belong to this TRI AI Saturdays Research Award project, so another award project will not accept them.

## 6. Close on the public result

Sign out and open `#/research` again.

The Yoruba project is listed because it is active, and **Open speech notes for Yoruba clinics** is the output TRI AI has marked publishable. The flood and Hausa projects are listed because they are in scoping. Their outputs stay off this page until TRI AI marks them publishable.

## Leave the demo as you found it

- Do not submit the application form.
- Do not send Kwame’s Hausa response.
- Do not mark a task done, sign the charter, or publish an output.
- Do not join an invite.
- Do not save a meeting. The meetings page can be opened, but saving adds a record. A new Google Doc also needs the local Drive sync, which the published site does not run.

If any of those are used, run `npm run seed:demo` before the next showing.
