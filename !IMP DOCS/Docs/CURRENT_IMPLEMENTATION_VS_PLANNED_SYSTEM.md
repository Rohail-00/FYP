# Current Implementation vs Planned System

## Purpose

This document separates what is already implemented from what is planned. This is useful for reports, supervisor discussions, and presentations because the project currently contains a working frontend prototype plus a detailed planned AI/backend architecture.

## Current Implementation

The current implementation is a frontend-focused legal consistency checker prototype.

Implemented:

- Firebase authentication.
- Email verification requirement.
- Login and signup.
- Profile name update.
- Email change flow.
- Password change flow.
- Authenticated dashboard.
- Navbar with user dropdown.
- Light/dark theme toggle.
- Repository creation.
- Repository file metadata management.
- Search Laws page with static legal examples.
- Repository scope selector in search.
- Consistency Audit page.
- Multi-File Analysis page.
- Analysis Report page with mock conflict results.
- Large test case document.
- Architecture and pipeline documentation.

Not implemented yet:

- Real backend file storage.
- Real OCR and document text extraction.
- Real legal corpus database.
- Real vector search.
- Real model inference.
- Real consistency reasoning.
- Real report generation from uploaded user content.

## Current Frontend Architecture

```text
User
  |
  v
Next.js Frontend
  |
  +-- Firebase Authentication
  |
  +-- Firestore User Profile
  |
  +-- localStorage Repository Metadata
  |
  +-- Static Search and Report Examples
```

## Current User Data Flow

### Authentication

```text
Signup/Login -> Firebase Auth -> Email Verification -> Authenticated Pages
```

### Repository

```text
Create Repository -> Add File Metadata -> Save to localStorage -> Use in UI Selectors
```

### Search

```text
Enter Query -> Choose Scope -> Filter Static Law Data -> View Details
```

### Consistency Audit

```text
Select Knowledge Base -> Paste Text or Upload File -> Validate Input -> Simulate Analysis -> Report Page
```

### Multi-File Analysis

```text
Upload 2-7 Files -> Validate Files -> Simulate Analysis -> Report Page
```

## Planned Complete System

The complete system will include a backend and AI pipeline.

```text
User Upload / Query
  |
  v
Frontend
  |
  v
Backend API
  |
  +-- Authentication Check
  +-- File Storage
  +-- Text Extraction
  +-- Clause Extraction
  +-- Clause Normalization
  +-- Repository Indexing
  +-- Retrieval
  +-- Multi-Expert Routing
  +-- Legal Reasoning
  +-- Explanation Generation
  |
  v
Report Returned to Frontend
```

## Planned Backend Components

| Component | Purpose |
|---|---|
| FastAPI | API layer |
| Firebase Auth verification | Verify logged-in user requests |
| File storage | Store uploaded repository documents |
| PaddleOCR | Extract text from scanned PDFs/images |
| Document parser | Extract text from DOCX, TXT, and digital PDFs |
| Clause segmenter | Split text into legal clauses |
| Metadata extractor | Extract act, section, year, jurisdiction, version |
| BGE-M3 | Retrieve relevant legal clauses |
| BGE Reranker | Re-rank retrieved candidates |
| DeBERTa-v3 router | Route clauses to relevant experts |
| Specialist experts | Analyze numbers, dates, negation, citations, meaning, priority |
| Drools + Z3 | Rule and logic reasoning |
| FLAN-T5 | Grounded explanation generation |

## Current Pages and Their Planned Backend Connections

| Page | Current Behavior | Planned Backend Connection |
|---|---|---|
| Search Laws | Static law filtering | Search API with statute/repository retrieval |
| My Repositories | localStorage metadata | Repository CRUD + file storage + indexing |
| Consistency Audit | UI validation and mock redirect | Analyze draft/file against selected knowledge base |
| Multi-File Analysis | UI validation and mock redirect | Temporary multi-document comparison job |
| Analysis Report | Mock report data | Real persisted or generated report |

## What Should Be Said in Presentation

Use this wording:

> The current implementation focuses on the complete frontend workflow. It shows how users authenticate, manage repositories, upload documents, search laws, submit clauses, and view reports. The backend AI pipeline is designed and documented as the next implementation phase.

Avoid saying:

> The system already performs real AI legal reasoning.

Better wording:

> The current report demonstrates the expected output format. The planned backend will generate these reports using multi-expert retrieval and legal reasoning.

## Why This Split Is Acceptable

The project has two important parts:

1. User-facing workflow and interface.
2. AI/backend reasoning architecture.

The frontend proves how users interact with the system. The architecture documents prove how the system will perform legal reasoning once backend integration is added.

## Risks and Future Work

| Risk | Future Work |
|---|---|
| Static examples do not cover real law corpus | Build corpus ingestion pipeline |
| localStorage is not secure persistent storage | Add authenticated backend storage |
| No real document parsing yet | Add OCR and parsers |
| No vector database yet | Add ChromaDB collections |
| No model inference yet | Add model-serving backend |
| No real report generation yet | Generate reports from expert outputs |

## Summary

The current PakLaw AI project is a functional frontend prototype with real authentication and strong planned architecture. The next major step is backend implementation: document storage, OCR, indexing, retrieval, multi-expert analysis, and grounded report generation.
