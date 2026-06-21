# Frontend Pages and User Flows

## Frontend Stack

The frontend is built using:

- Next.js App Router
- React client components
- TypeScript
- Firebase Authentication
- Firebase Firestore for user profile records
- localStorage for repository metadata and theme preference
- lucide-react icons
- Global CSS variables for light and dark themes

The frontend is currently the main implemented part of the project.

## Navigation Structure

After login, the user can access:

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Dashboard with main workflow shortcuts |
| `/search` | Search Laws | Search statute examples and repository-scoped clauses |
| `/repositories` | My Repositories | Create document collections and add files |
| `/check` | Consistency Audit | Submit draft text or document for consistency checking |
| `/multi-analysis` | Multi-File Analysis | Upload multiple files to compare inconsistencies |
| `/report` | Analysis Report | View mock conflict results |
| `/settings` | Profile Settings | Change display name |
| `/change-email` | Change Email | Request verified email change |
| `/change-password` | Change Password | Change password after reauthentication |

The navbar only shows protected navigation when the user is authenticated.

## Home Dashboard Flow

File: `frontend/src/app/page.tsx`

The home page checks authentication state using `useAuth`. If the user is not authenticated, they are redirected to `/login`.

When authenticated, the page displays four main actions:

1. Check Consistency
2. Search Laws
3. My Repositories
4. Multi-File Analysis

This page acts as the central entry point for the application.

## Search Laws Flow

File: `frontend/src/app/search/page.tsx`

The Search Laws page lets the user:

1. Choose a search scope.
2. Search by clause, keyword, section, title, or notes.
3. Filter by legal category.
4. View matching statute cards.
5. Open a modal for detailed statute text and notes.

Current categories include:

- PPC
- PECA
- Constitution
- ATA

The page also supports repository scope selection. If a repository is selected, the UI explains that search will be limited to that repository. At the current frontend-prototype stage, results still come from static law examples.

## My Repositories Flow

File: `frontend/src/app/repositories/page.tsx`

The My Repositories page lets the user:

1. Create a repository with a name and optional description.
2. Upload files into a repository.
3. Expand or collapse repository cards.
4. View file metadata.
5. Remove files.
6. Delete repositories after confirmation.

Accepted file types:

- PDF
- DOC
- DOCX
- TXT

Repository data is stored in localStorage through `RepoContext`. This keeps the frontend behavior working without a backend file storage service.

## Consistency Audit Flow

File: `frontend/src/app/check/page.tsx`

The Consistency Audit page supports a single-clause or single-document analysis flow.

The user can:

1. Select a knowledge base.
2. Paste draft clause text.
3. Upload one PDF, DOCX, or TXT file.
4. Use the voice-typing mock helper.
5. Submit for inconsistency analysis.

The current page validates:

- File type
- Maximum file size of 10 MB
- At least one input source, either text or file

After submission, the UI shows a neural-symbolic checking state and redirects to `/report`.

## Multi-File Analysis Flow

File: `frontend/src/app/multi-analysis/page.tsx`

The Multi-File Analysis page is used when the user wants to compare documents directly without using a saved repository.

The user can:

1. Upload 2 to 7 files.
2. Drag and drop documents.
3. Remove selected files.
4. See validation feedback.
5. Start analysis after the minimum file count is reached.

Rules:

- Minimum files: 2
- Maximum files: 7
- Maximum file size: 10 MB each
- Accepted types: PDF, DOC, DOCX, TXT

After analysis starts, the page redirects to `/report`.

## Analysis Report Flow

File: `frontend/src/app/report/page.tsx`

The report page displays mock conflict results. It demonstrates how final backend output will be presented.

The user can:

1. View detected conflicts.
2. Filter by severity.
3. Open a modal with detailed comparison.
4. See proposed draft text against active statute text.
5. Read heuristic reasoning.
6. Run a new check.

Severity groups:

- High Conflict
- Medium Overlap
- Low Exception

## Settings and Profile Flow

The profile dropdown in the navbar gives access to:

- Dark mode / light mode toggle
- Change profile name
- Change email
- Change password
- Logout

The dropdown displays the authenticated user's profile name and a simple `User` label.

## Protected Route Pattern

Most protected pages follow the same pattern:

1. Read `isAuthenticated` and `isLoading` from `useAuth`.
2. While loading, show a loading message.
3. If loading is complete and the user is not authenticated, redirect to `/login`.
4. Render page content only for authenticated users.

This pattern keeps the frontend consistent and prevents unauthenticated access to project workflows.

## Current Frontend Limitations

- Search and report data are static examples.
- Uploaded file content is not parsed on the frontend.
- Repository upload currently stores metadata only.
- The AI analysis result is simulated by redirecting to the report page.
- Backend model outputs are represented through planned architecture and mock UI.

## Summary

The frontend already provides the user journey expected from a legal AI platform: login, profile, repository organization, law search, consistency checking, multi-file comparison, and report viewing. The main missing part is backend integration for real document parsing, indexing, retrieval, AI routing, and legal reasoning.
