# Repository, Search, and Analysis Workflow

## Purpose

Repositories allow users to organize legal documents into separate collections. This is important because legal analysis often needs a specific context. For example, a user may want to check a university policy only against university rules, or a cybercrime clause only against PECA-related documents.

The current frontend implements repository management and repository-aware UI flows. The backend indexing and real repository-scoped search are planned for future integration.

## Repository Data Model

Defined in `frontend/src/context/RepoContext.tsx`.

```ts
export interface RepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  files: RepoFile[];
}
```

## Repository Storage

Repositories are stored in localStorage using a user-specific key:

```ts
pak_repos_${uid}
```

This means each authenticated user gets a separate local repository list in the browser.

## Repository Page Workflow

File: `frontend/src/app/repositories/page.tsx`

The My Repositories page supports:

1. Creating repositories.
2. Adding file metadata to repositories.
3. Expanding/collapsing repository cards.
4. Viewing file names, sizes, and upload dates.
5. Removing files from a repository.
6. Deleting repositories.

Accepted file extensions:

- `.pdf`
- `.doc`
- `.docx`
- `.txt`

The frontend does not yet upload files to cloud storage or index file contents. It stores file metadata only.

## Why Repositories Matter

Repository scoping prevents irrelevant laws or documents from affecting analysis.

Example:

If a user is checking a university attendance policy, the system should prefer university regulations and related repository documents instead of comparing the clause against every law in the national corpus.

Repository scope can improve:

- Search relevance
- Analysis accuracy
- Retrieval speed
- Explanation clarity
- User control over document context

## Search Laws Workflow

File: `frontend/src/app/search/page.tsx`

The Search Laws page includes:

- Search scope selector
- Keyword search input
- Category filters
- Result cards
- Detail modal

Search fields currently include:

- Section
- Title
- Text
- Notes

Search categories currently include:

- PPC
- PECA
- Constitution
- ATA

## Repository-Scoped Search Concept

The UI lets the user select:

- All PakLaw Statutes
- A specific repository

When a repository is selected, the frontend changes helper text and placeholder text to communicate that search is scoped to that repository.

Planned backend behavior:

1. User chooses a repository.
2. Backend loads only indexed chunks from that repository.
3. Query is embedded using BGE-M3.
4. Candidate chunks are retrieved from the selected repository collection.
5. BGE Reranker improves result order.
6. The user receives repository-specific legal clause results.

## Consistency Audit Workflow

File: `frontend/src/app/check/page.tsx`

The Consistency Audit page lets the user select a knowledge base before submitting a draft clause or file.

Knowledge base options:

- None - scan all Pak Law PDFs
- Specific repository

Input methods:

- Paste draft clause text
- Upload one PDF, DOCX, or TXT file
- Use mock voice typing

Validation:

- At least one input is required.
- Only supported file types are accepted.
- Maximum file size is 10 MB.

After submission, the page shows a checking state and redirects to the report page.

## Planned Consistency Analysis Flow

In the planned backend, the flow will be:

1. Receive draft text or uploaded document.
2. Extract clauses.
3. Normalize clauses.
4. Retrieve relevant existing clauses from selected repository or full law corpus.
5. Create candidate clause pairs.
6. Route each pair to relevant expert models.
7. Merge expert outputs.
8. Apply legal reasoning.
9. Generate result and explanation.

## Multi-File Analysis Workflow

File: `frontend/src/app/multi-analysis/page.tsx`

Multi-File Analysis is different from repository-based analysis.

It is for temporary direct comparison between uploaded documents.

Rules:

- Minimum files: 2
- Maximum files: 7
- Maximum file size: 10 MB each
- Accepted types: PDF, DOC, DOCX, TXT

Planned backend behavior:

1. Extract text from all uploaded files.
2. Segment clauses.
3. Compare clauses across the uploaded file set.
4. Detect contradictions, overlaps, exceptions, and inconsistent values.
5. Generate a report scoped only to the uploaded files.

## Analysis Report Workflow

File: `frontend/src/app/report/page.tsx`

The current report page demonstrates the final output format.

Each report item includes:

- Title
- Severity
- Confidence percentage
- Short description
- Proposed draft text
- Active statute text
- Heuristic reasoning

The detail modal compares proposed text and active statute text side by side.

## Repository Search vs Multi-File Analysis

| Feature | Repository Search / Audit | Multi-File Analysis |
|---|---|---|
| Scope | Saved repository or all statutes | Temporary uploaded files |
| Input | Query, clause text, or one file | 2-7 files |
| Persistence | Repository metadata is saved | Files are temporary |
| Purpose | Search or check against known context | Compare documents with each other |
| Future backend | Vector index by repository | Temporary analysis job |

## Current Limitations

- Repository files are not stored permanently as full documents.
- Repository content is not parsed or indexed yet.
- Repository search scope is currently a frontend UI behavior.
- Reports are mock results.

## Future Backend Requirements

To make repositories fully functional, the backend should add:

1. Authenticated file upload storage.
2. Per-user repository document collections.
3. OCR and text extraction.
4. Clause segmentation.
5. Metadata extraction.
6. Repository-scoped vector indexing.
7. Search API with repository filters.
8. Analysis API with repository filters.
9. Report persistence.

## Summary

Repositories are the project's context-management feature. They let the user decide which document collection should be searched or used during analysis. The current frontend already presents this workflow, while the planned backend will later turn repositories into real indexed legal knowledge bases.
