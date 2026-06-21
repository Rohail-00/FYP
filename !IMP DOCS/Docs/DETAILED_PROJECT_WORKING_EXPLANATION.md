# Detailed Project Working Explanation

## 1. Project Introduction

PakLaw AI is a legal consistency checking system designed for Pakistani legal documents. Its goal is to help users check whether a proposed legal clause, amendment, policy, or document conflicts with existing statutes or with documents stored in a user repository.

The project is built around the idea that legal inconsistency is not only a text-matching problem. A clause can conflict because of meaning, numbers, dates, exceptions, permissions, prohibitions, citations, or legal hierarchy. Because of this, the planned system uses a multi-expert architecture instead of depending on one model only.

At the current stage, the project mainly implements the frontend workflow. It shows how a user will interact with the system: authentication, repository management, law search, consistency checking, multi-file analysis, and report viewing. The backend AI pipeline is planned and documented for future implementation.

## 2. Main Objective

The main objective of PakLaw AI is to support legal consistency checking by:

1. Allowing users to organize legal documents into repositories.
2. Allowing users to search active statutes and repository documents.
3. Allowing users to submit draft clauses or documents for analysis.
4. Detecting possible conflicts, overlaps, exceptions, or uncertain cases.
5. Showing results with explanation, evidence, confidence, and legal reasoning.

The system is not intended to replace lawyers or legal experts. It is intended to assist legal drafting and review by highlighting possible inconsistencies that need attention.

## 3. Current Project Architecture

The current implementation is a frontend prototype using Next.js and Firebase.

```text
User
  |
  v
Next.js Frontend
  |
  +-- Firebase Authentication
  +-- Firestore User Profile
  +-- localStorage Repository Metadata
  +-- Static Law Search Examples
  +-- Mock Analysis Report
```

The frontend is responsible for:

- Displaying pages and workflows.
- Managing authentication state.
- Handling user input.
- Validating uploaded files.
- Managing repository metadata.
- Showing search and report results.

The planned backend will later be responsible for:

- Storing uploaded documents.
- Extracting text from documents.
- Indexing repository content.
- Running retrieval.
- Routing clauses to expert models.
- Performing legal reasoning.
- Returning real generated reports.

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js | Page routing and React app structure |
| UI Library | React | Building interactive pages |
| Language | TypeScript | Type safety and maintainability |
| Authentication | Firebase Auth | Signup, login, logout, email verification |
| Profile Storage | Firestore | User profile records |
| Local State | React state | Page-level UI behavior |
| Local Persistence | localStorage | Theme and repository metadata |
| Icons | lucide-react | UI icons |
| Planned Backend | FastAPI | API layer for AI processing |
| Planned Vector Store | ChromaDB | Store and search legal embeddings |
| Planned Retrieval Model | BGE-M3 | Retrieve relevant legal clauses |
| Planned Reranker | BGE Reranker | Improve retrieved result ranking |
| Planned NLI Model | DeBERTa-v3 Legal NLI | Detect entailment, contradiction, neutral |
| Planned Reasoning Tools | Drools, Microsoft Z3, Neo4j | Legal rules, exact logic, knowledge graph |

## 5. Authentication Working

Authentication is handled in `frontend/src/context/AuthContext.tsx`.

The user must create an account, verify email, and then login. This prevents unverified accounts from accessing the protected project pages.

### Signup Flow

```text
User enters name, email, password
  |
  v
Firebase creates account
  |
  v
Display name is updated
  |
  v
Firestore profile document is created
  |
  v
Verification email is sent
  |
  v
User is signed out until verification
```

During signup, the project stores a Firestore user document containing:

- Name
- Email
- Role value as `user`
- Created timestamp

The role value exists for possible future use, but the current project does not include admin behavior.

### Login Flow

```text
User enters email and password
  |
  v
Firebase validates credentials
  |
  v
System checks email verification
  |
  +-- Not verified -> sign out and show message
  |
  +-- Verified -> allow access to dashboard
```

### Protected Pages

Protected pages check:

```ts
isAuthenticated
isLoading
```

If the user is not authenticated, the page redirects to `/login`.

Protected pages include:

- Home
- Search Laws
- My Repositories
- Consistency Audit
- Multi-File Analysis
- Analysis Report
- Settings pages

## 6. Profile and Settings Working

The navbar contains a profile dropdown. It shows the user's display name and gives access to:

- Light/dark mode toggle
- Change profile name
- Change email
- Change password
- Logout

### Change Profile Name

When a user changes their display name:

1. Firebase Auth profile is updated.
2. Firestore user document is updated.
3. React context state is updated.
4. Navbar shows the new name.

### Change Password

Password change requires reauthentication:

```text
Current password + new password
  |
  v
Firebase reauthenticates user
  |
  v
Firebase updates password
```

### Change Email

Email change also requires reauthentication. Firebase sends a verification link to the new email. The email changes only after verification.

## 7. Dashboard Working

The dashboard is implemented in `frontend/src/app/page.tsx`.

After login, the user sees four main actions:

1. Check Consistency
2. Search Laws
3. My Repositories
4. Multi-File Analysis

This page works as the central navigation point for the application.

## 8. Repository Management Working

Repositories are managed in:

```text
frontend/src/context/RepoContext.tsx
frontend/src/app/repositories/page.tsx
```

Repositories allow the user to group related documents.

Example:

- University Regulations
- Cybercrime Laws
- Company Policy Drafts
- Contract Documents

### Repository Data Structure

```ts
Repository {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  files: RepoFile[];
}
```

Each file is stored as metadata:

```ts
RepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}
```

### Repository Storage

The current project stores repository metadata in localStorage using:

```text
pak_repos_${uid}
```

This makes repositories user-specific in the browser.

### Repository Page Features

The My Repositories page allows the user to:

- Create a repository.
- Add files to a repository.
- Expand or collapse repository cards.
- View uploaded file names and sizes.
- Remove individual files.
- Delete repositories.

Accepted file types:

- PDF
- DOC
- DOCX
- TXT

At this stage, the actual file content is not permanently uploaded to a backend. Only metadata is stored.

## 9. Search Laws Working

The Search Laws page is implemented in:

```text
frontend/src/app/search/page.tsx
```

The page lets the user search example statutes by:

- Section
- Title
- Keyword
- Statute text
- Notes

### Search Scope

The page includes a search scope selector:

- All PakLaw Statutes
- A selected user repository

If a repository is selected, the UI explains that search is limited to that repository. In the current frontend prototype, results still come from static law examples. In the planned backend, this selector will filter the vector search to the selected repository.

### Category Filters

The current category filters are:

- All Categories
- PPC
- PECA
- Constitution
- ATA

### Search Result Flow

```text
User enters query
  |
  v
Frontend filters static law data
  |
  v
Matching cards are displayed
  |
  v
User clicks result
  |
  v
Detail modal opens
```

The modal shows:

- Statutory provision text
- Application notes
- Enacted year
- Category

## 10. Consistency Audit Working

The Consistency Audit page is implemented in:

```text
frontend/src/app/check/page.tsx
```

This page is used when the user wants to check one draft clause or one uploaded document.

### User Inputs

The user can provide:

- Draft clause text
- Uploaded document file
- Repository/knowledge base selection

### File Validation

The frontend validates:

- File type
- File size
- Input presence

Accepted file types:

- PDF
- DOC
- DOCX
- TXT

Maximum file size:

```text
10 MB
```

### Submit Flow

```text
User selects knowledge base
  |
  v
User pastes clause or uploads document
  |
  v
Frontend validates input
  |
  v
Button changes to checking state
  |
  v
User is redirected to report page
```

The current flow simulates backend analysis. The report page contains mock results.

## 11. Multi-File Analysis Working

The Multi-File Analysis page is implemented in:

```text
frontend/src/app/multi-analysis/page.tsx
```

This page is for comparing multiple uploaded files directly.

### Rules

| Rule | Value |
|---|---|
| Minimum files | 2 |
| Maximum files | 7 |
| Maximum size | 10 MB each |
| Accepted types | PDF, DOC, DOCX, TXT |

### Flow

```text
User uploads files
  |
  v
Frontend validates file count, type, and size
  |
  v
Files appear in selected list
  |
  v
Analyze button is enabled after 2 files
  |
  v
Simulated analysis starts
  |
  v
User is redirected to report page
```

This feature is different from repository analysis because files are temporary and are compared directly with each other.

## 12. Report Page Working

The Analysis Report page is implemented in:

```text
frontend/src/app/report/page.tsx
```

The current report page uses mock results to demonstrate the expected final output.

Each report item includes:

- Title
- Severity
- Confidence percentage
- Short description
- Proposed draft
- Active statute
- Heuristic reasoning

### Severity Levels

| Severity | Meaning |
|---|---|
| High Conflict | Strong contradiction or serious inconsistency |
| Medium Overlap | Possible overlap or domain conflict |
| Low Exception | Possible exception or boundary issue |

### Report Interaction

```text
Report list appears
  |
  v
User filters by severity
  |
  v
User opens details
  |
  v
Modal compares draft and active statute
```

## 13. Planned Backend Working

The planned backend will convert the current prototype into a real AI system.

### Backend Flow

```text
Frontend request
  |
  v
Backend authentication check
  |
  v
Document upload or text input
  |
  v
Text extraction
  |
  v
Clause extraction
  |
  v
Clause normalization
  |
  v
Repository or statute retrieval
  |
  v
Multi-expert routing
  |
  v
Expert analysis
  |
  v
Result merging
  |
  v
Consistency reasoning
  |
  v
Explanation generation
  |
  v
Final report
```

## 14. Document Processing Pipeline

When a document is uploaded, the planned backend should process it like this:

1. Detect file type.
2. Extract text using OCR or parser.
3. Clean extracted text.
4. Split document into sections and clauses.
5. Preserve original citations and numbering.
6. Normalize each clause.
7. Store metadata and clause text.
8. Build searchable embeddings.

### Clause Extraction

Clause extraction means splitting a long legal document into smaller legal units.

Example:

```text
Section 12
(1) Every applicant shall submit the form within 30 days.
(2) The authority may extend the deadline for valid reasons.
```

This can become:

- Clause 12(1)
- Clause 12(2)

### Clause Normalization

Clause normalization means converting a legal clause into a cleaner structured form while keeping the original meaning.

It may identify:

- Subject
- Action
- Duty or permission
- Condition
- Exception
- Date
- Amount
- Citation

## 15. Retrieval Working

Retrieval finds relevant existing laws or repository clauses for comparison.

Planned retrieval flow:

```text
User clause
  |
  v
Create embedding using BGE-M3
  |
  v
Search vector index
  |
  v
Apply repository and metadata filters
  |
  v
Rerank candidates using BGE Reranker
  |
  v
Return best matching legal clauses
```

Repository filters may include:

- Repository ID
- Document ID
- Act name
- Section
- Jurisdiction
- Year
- Version

## 16. Multi-Expert Routing Working

The clause router decides which expert modules should analyze a clause.

Routing is multi-label. This means the system does not choose only one expert. A single clause may go to many experts.

Example:

```text
A person must appeal within 30 days unless the authority grants an extension.
```

This clause should route to:

- Date Expert
- Deontic Expert
- Condition Expert
- Semantic NLI Expert

### Routing Checks

| Check | Route |
|---|---|
| Contains amount, percentage, limit, penalty | Number Expert |
| Contains date, deadline, duration, amendment | Date Expert |
| Contains if, unless, exception | Condition Expert |
| Contains shall, must, may, prohibited | Deontic Expert |
| Contains not, no, except, unless | Negation Expert |
| Contains section, act, article, citation | Citation Expert |
| Needs meaning comparison | Legal NLI Expert |
| Needs special/newer/higher law logic | Legal Priority Expert |

## 17. Specialist Expert Working

### Number Expert

Proposed tool:

```text
Python Decimal
```

Purpose:

- Extract fines, amounts, percentages, years, ages, limits, penalties.
- Compare exact values.
- Detect contradictions such as 3 years vs 5 years.

### Date Expert

Proposed tool:

```text
HeidelTime
```

Purpose:

- Extract dates and deadlines.
- Understand durations.
- Compare effective periods.
- Detect expired or newer amendments.

### Condition Expert

Proposed tools:

```text
DeBERTa-v3 + Microsoft Z3
```

Purpose:

- Detect if/unless/provided-that structures.
- Convert conditions into logical form.
- Check whether exceptions change the final decision.

### Deontic Expert

Proposed model:

```text
DeBERTa-v3
```

Purpose:

- Detect obligations.
- Detect permissions.
- Detect prohibitions.
- Understand legal modal verbs like shall, may, must, and prohibited.

### Negation Expert

Proposed model:

```text
NegBERT
```

Purpose:

- Detect negation cues.
- Detect negation scope.
- Prevent false conclusions where meaning is reversed.

### Citation Expert

Proposed tools:

```text
Legal-BERT NER + Neo4j
```

Purpose:

- Extract legal citations.
- Link sections, acts, amendments, and references.
- Use the knowledge graph to understand cross-references.

### Meaning Expert

Proposed model:

```text
DeBERTa-v3 Legal NLI
```

Purpose:

- Compare the meaning of two clauses.
- Classify relationship as:
  - Entailment
  - Contradiction
  - Neutral

### Legal Priority Expert

Proposed tools:

```text
Drools + Neo4j
```

Purpose:

- Apply legal hierarchy.
- Apply special-law-over-general-law logic.
- Apply newer-law-over-older-law logic.
- Consider jurisdiction and amendment relationships.

## 18. Result Merging and Reasoning

After experts produce outputs, the system merges their findings.

Example:

```text
Number Expert: conflict because punishment is 5 years instead of 3 years
NLI Expert: contradiction
Citation Expert: both refer to PPC Section 379
Priority Expert: no newer valid amendment found
```

The consistency reasoner combines this evidence and returns:

```text
High Conflict
```

### Consistency Reasoner

Proposed tools:

```text
Drools + Microsoft Z3
```

It checks:

- Whether duties contradict permissions.
- Whether prohibitions contradict rights.
- Whether numbers or dates conflict.
- Whether exceptions apply.
- Whether one law has priority.
- Whether confidence is high enough.

## 19. Confidence and Uncertain Results

The app does not require an expert review screen in the user flow.

Instead:

```text
High confidence -> return Consistent or Conflict
Low confidence -> mark result as Uncertain
```

An uncertain result should still explain:

- Which clauses were compared.
- Which experts disagreed.
- Which evidence was weak.
- Why the system could not confidently decide.

## 20. Explanation Generation

The explanation generator should produce a clear report using only verified system outputs.

Proposed model:

```text
FLAN-T5
```

The explanation should include:

- Result status
- Severity
- Confidence
- Compared clauses
- Evidence
- Citations
- Reasoning trace
- Uncertainty if applicable

The explanation should not invent laws or unsupported reasoning.

## 21. Example End-to-End Scenario

### User Input

```text
Whoever commits theft shall be punished with imprisonment for a term which may extend to five years.
```

### Retrieved Existing Law

```text
PPC Section 379: Whoever commits theft shall be punished with imprisonment for a term which may extend to three years.
```

### Expert Routing

The clause routes to:

- Number Expert because it contains punishment duration.
- Deontic Expert because it contains "shall".
- Citation/Meaning Expert because it must be compared with PPC Section 379.
- Legal Priority Expert if amendment status must be checked.

### Expert Results

Possible outputs:

- Number Expert detects 5 years vs 3 years.
- Meaning Expert detects contradiction.
- Legal Priority Expert finds no valid newer amendment.

### Final Result

```text
High Conflict
```

### Explanation

The proposed draft changes the maximum imprisonment term for theft from three years to five years. Since both clauses apply to the same offense and no valid amendment priority is detected, the system marks it as a high conflict.

## 22. Current Limitations

The current implementation has these limitations:

- Search data is static.
- Report data is mock.
- Repository files are metadata only.
- Uploaded documents are not parsed.
- AI models are not connected yet.
- Backend APIs are not implemented yet.
- Vector search is planned but not live.

These limitations are acceptable for the current frontend stage as long as they are explained clearly.

## 23. Future Work

Future work should include:

1. Backend API using FastAPI.
2. Firebase token verification on backend.
3. Secure file upload storage.
4. OCR and document parsing.
5. Clause extraction and normalization.
6. ChromaDB vector storage.
7. Repository-scoped search.
8. Model-serving pipeline.
9. Multi-expert routing.
10. Real report generation.
11. Report history.
12. Evaluation on Pakistani legal datasets.

## 24. Final Summary

PakLaw AI is designed as a legal consistency checking platform. The current frontend demonstrates how users will interact with the system, while the planned backend architecture explains how real legal reasoning will be performed.

The main strength of the project is its multi-expert approach. Instead of expecting one model to understand every legal issue, the system separates numeric, temporal, semantic, logical, citation, and precedence reasoning into specialist modules. This makes the design more suitable for complex legal documents and gives the final report stronger evidence and explanation.
