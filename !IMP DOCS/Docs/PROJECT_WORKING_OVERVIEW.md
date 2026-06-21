# PakLaw AI - Project Working Overview

## Purpose

PakLaw AI is a legal consistency checking system focused on Pakistani legal documents. The project is designed to help a user upload, organize, search, and analyze legal clauses so that proposed amendments or policy clauses can be checked against existing laws and repository documents.

The current project is mainly a frontend prototype built in Next.js. Authentication, profile management, repository management, document upload UI, search UI, report UI, and analysis flows are implemented on the frontend. The deeper AI pipeline and backend reasoning system are documented as planned architecture.

## Main Problem

Legal drafting is difficult because a new clause may conflict with existing statutes, definitions, exceptions, dates, penalties, permissions, or legal hierarchy. A normal keyword search is not enough because legal inconsistency can appear in many forms:

- A punishment period may contradict an existing maximum sentence.
- A clause may use different wording but create the same legal effect.
- A new provision may be valid only if it is more specific or newer.
- An exception may override a general rule.
- A date, deadline, percentage, or amount may change the meaning of the clause.
- A negation such as "not", "unless", or "shall not" may reverse the intended meaning.

The project therefore separates the work into frontend user flows and a planned multi-expert AI architecture.

## Current Implemented Scope

The implemented application contains these major frontend features:

| Area | Current Status | Description |
|---|---:|---|
| Authentication | Implemented | Firebase email/password login, signup, email verification, logout |
| Profile Management | Implemented | Display name update, email change flow, password change flow |
| Dashboard | Implemented | Home page linking to the main user workflows |
| Search Laws | Implemented as frontend prototype | Search static statute examples and select repository scope |
| My Repositories | Implemented as frontend prototype | Create repositories and attach uploaded file metadata |
| Consistency Audit | Implemented as frontend prototype | Paste draft text or upload a document and select knowledge base |
| Multi-File Analysis | Implemented as frontend prototype | Upload 2-7 files for comparison flow |
| Analysis Report | Implemented as frontend prototype | Shows mock conflict report cards and details modal |
| Theme | Implemented | Light/dark mode stored in localStorage |
| Admin Features | Removed | The current project has no admin pages or admin navigation |

## Planned AI and Backend Scope

The planned backend is a hybrid legal AI system. It does not rely on one model to solve all legal reasoning tasks. Instead, the system routes clauses to multiple specialist models and symbolic tools.

Planned components include:

- Document parsing and OCR using PaddleOCR and document parsers.
- Clause extraction and normalization.
- Repository-scoped retrieval using BGE-M3 and a reranker.
- Multi-label clause routing using DeBERTa-v3.
- Specialist checks for numbers, dates, negation, deontic meaning, citations, legal priority, and semantic contradiction.
- Symbolic reasoning using tools such as Python Decimal, HeidelTime, Microsoft Z3, Neo4j, and Drools.
- Explanation generation using grounded output from verified model and rule results.

## High-Level User Workflow

1. The user signs up and verifies their email.
2. The user logs in and reaches the dashboard.
3. The user creates repositories for different document collections.
4. The user uploads PDF, DOCX, or TXT files into repositories.
5. The user searches statutes or repository-scoped legal material.
6. The user runs a consistency audit by entering draft text or uploading a document.
7. The user may also run multi-file analysis by uploading multiple documents.
8. The system returns an analysis report showing conflicts, overlaps, severity, reasoning, and evidence.

## Important Project Files

| Path | Purpose |
|---|---|
| `frontend/src/app/page.tsx` | Authenticated dashboard |
| `frontend/src/app/search/page.tsx` | Federal statutes and repository-scoped search UI |
| `frontend/src/app/repositories/page.tsx` | Repository creation and file metadata management |
| `frontend/src/app/check/page.tsx` | Single consistency audit UI |
| `frontend/src/app/multi-analysis/page.tsx` | Multi-file analysis UI |
| `frontend/src/app/report/page.tsx` | Analysis report UI |
| `frontend/src/context/AuthContext.tsx` | Firebase auth state and account functions |
| `frontend/src/context/RepoContext.tsx` | Frontend repository state using localStorage |
| `frontend/src/components/Navbar.tsx` | Main authenticated navigation and profile dropdown |
| `frontend/src/lib/firebase.ts` | Firebase client configuration |

## Documentation and Diagram Files

| File | Description |
|---|---|
| `!IMP DOCS/1. Part1 & Part2.png` | Scope image for project parts |
| `!IMP DOCS/2. Pipeline.png` | Simple user-upload-to-result pipeline |
| `!IMP DOCS/3. System Architecture.png` | Multi-expert system architecture diagram |
| `!IMP DOCS/4. System Flow.png` | Detailed system sequence flow diagram |
| `!IMP DOCS/MULTI_MODEL_ARCHITECTURE_AND_DATA_PIPELINE.md` | Detailed AI architecture and data pipeline |
| `!IMP DOCS/TEST_CASES.md` | Large project-wide test case document |

## Current Limitations

- The current law search uses static example law data on the frontend.
- Repository files are stored as metadata in localStorage; actual file content is not indexed yet.
- The report page currently displays mock analysis results.
- The multi-expert AI backend is planned and documented but not fully implemented.
- No admin workflow exists in the current application.

## Summary

PakLaw AI currently demonstrates the complete user-facing workflow for a legal consistency checking platform. The frontend shows how users authenticate, manage repositories, upload documents, search laws, run checks, and view reports. The planned backend architecture explains how the project will evolve into a multi-expert legal AI system capable of semantic, numeric, temporal, citation, and rule-based legal reasoning.
