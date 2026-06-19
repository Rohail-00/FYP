# Setup and Demo Guide

## Purpose

This guide explains how to run and demonstrate the current PakLaw AI project. It is written for development, presentation, and supervisor review.

## Project Location

Main workspace:

```text
C:\1-FYP
```

Frontend app:

```text
C:\1-FYP\frontend
```

Important docs:

```text
C:\1-FYP\!IMP DOCS
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Global CSS variables |
| Authentication | Firebase Authentication |
| Profile Data | Firestore |
| Repository Prototype | Browser localStorage |
| Icons | lucide-react |
| Planned Backend | FastAPI |
| Planned Vector DB | ChromaDB |
| Planned AI | Multi-expert Legal AI pipeline |

## Install Dependencies

From the frontend folder:

```powershell
cd C:\1-FYP\frontend
npm install
```

## Environment Variables

Create a `.env.local` file inside:

```text
C:\1-FYP\frontend
```

Required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These values should come from the Firebase project settings.

## Run Development Server

```powershell
cd C:\1-FYP\frontend
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Run Lint

```powershell
cd C:\1-FYP\frontend
npm run lint
```

## TypeScript Check

The project does not currently define a separate TypeScript script in `package.json`, but it can be checked with:

```powershell
cd C:\1-FYP\frontend
npx tsc --noEmit --incremental false
```

## Demo Flow

Use this order during a demo:

1. Signup
2. Email verification explanation
3. Login
4. Dashboard
5. Create a repository
6. Add files to repository
7. Search laws
8. Select repository scope in search
9. Run consistency audit
10. Upload or paste a draft clause
11. Open analysis report
12. Show conflict detail modal
13. Show multi-file analysis page
14. Show profile/settings dropdown
15. Show architecture and pipeline docs/images

## Recommended Demo Script

### 1. Authentication

Explain that users must verify their email before using the legal analysis system. This protects the platform and keeps repository data tied to verified users.

### 2. Dashboard

Show the four core actions:

- Check Consistency
- Search Laws
- My Repositories
- Multi-File Analysis

### 3. Repository Management

Create a repository such as:

```text
University Policy Documents
```

Add a short description:

```text
Repository for university rules, policies, and legal references.
```

Upload sample PDF, DOCX, or TXT files. Explain that the current frontend stores metadata and that full backend indexing is planned.

### 4. Search Laws

Search for terms such as:

```text
theft
```

or:

```text
Article 24
```

Show category filtering and the details modal.

### 5. Consistency Audit

Paste a draft clause or upload a document. Select a repository scope if available.

Example draft:

```text
Whoever commits theft shall be punished with imprisonment for a term which may extend to five years.
```

Explain that this can conflict with PPC Section 379 where the active example statute has a different punishment period.

### 6. Report Page

Show:

- High conflict
- Medium overlap
- Low exception
- Detail modal
- Proposed draft vs active statute
- Heuristic reasoning

### 7. Multi-File Analysis

Upload 2 to 7 files and explain that this route compares uploaded files directly, without requiring a saved repository.

## Current Prototype Behavior

| Feature | Current Behavior |
|---|---|
| Login/signup | Real Firebase auth |
| Email verification | Real Firebase email verification |
| Profile update | Firebase + Firestore |
| Repositories | localStorage metadata |
| File upload | Browser-side validation and metadata |
| Search results | Static law examples |
| Consistency report | Mock report data |
| Multi-file analysis | UI flow with simulated redirect |

## Planned Backend Behavior

The final backend should:

1. Store uploaded documents.
2. Extract document text.
3. Segment clauses.
4. Build repository indexes.
5. Search repository documents.
6. Run multi-expert analysis.
7. Generate evidence-based reports.
8. Store report history.

## Important Presentation Files

| File | Use |
|---|---|
| `!IMP DOCS/1. Part1 & Part2.png` | Explain project scope |
| `!IMP DOCS/2. Pipeline.png` | Explain simple user-to-result pipeline |
| `!IMP DOCS/3. System Architecture.png` | Explain multi-expert architecture |
| `!IMP DOCS/4. System Flow.png` | Explain detailed clause routing sequence |
| `!IMP DOCS/MULTI_MODEL_ARCHITECTURE_AND_DATA_PIPELINE.md` | Technical architecture explanation |
| `!IMP DOCS/TEST_CASES.md` | Testing coverage |

## Demo Talking Points

- The project is not a simple chatbot.
- It is a legal consistency checking system.
- It separates frontend user workflow from planned AI backend reasoning.
- It supports repository-based legal context.
- It avoids relying on one model for all legal reasoning.
- It uses multi-label routing so one clause can go to several expert modules.
- It returns evidence and explanations, not only a yes/no answer.

## Known Limitations to Mention Honestly

- Backend AI processing is planned, not fully connected.
- Repository file content is not yet indexed.
- Search results and reports are prototype examples.
- The frontend demonstrates the complete intended user flow.

## Summary

The current project is ready to demonstrate the frontend workflow and planned architecture. It clearly shows how users will manage documents, search legal material, run consistency checks, and receive reports once the backend AI pipeline is connected.
