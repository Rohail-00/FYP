# AI Pipeline and Backend Plan

## Purpose

The AI backend is planned as a hybrid legal reasoning system. It should not rely on a single LegalBERT or DeBERTa model for every legal problem. Legal clauses contain language, numbers, dates, permissions, prohibitions, exceptions, citations, and legal hierarchy. These need different specialist methods.

The planned architecture uses a multi-expert pipeline:

- Transformers for language understanding.
- Symbolic tools for exact numbers, dates, and logic.
- Knowledge graphs for citations, definitions, amendments, and precedence.
- Rule engines for legal priority and conflict resolution.
- Grounded generation for final explanations.

## Why One Model Is Not Enough

A single model may understand general legal language, but legal consistency checking requires different forms of reasoning.

| Reasoning Type | Example | Why a Single Model Struggles |
|---|---|---|
| Numeric | "fine up to five million rupees" | Needs exact amount extraction and comparison |
| Temporal | "within 30 days" | Needs deadline and interval logic |
| Deontic | "shall", "may", "must not" | Needs legal modality classification |
| Negation | "shall not apply unless" | Needs polarity and scope detection |
| Conditional | "if", "unless", "provided that" | Needs structured rule logic |
| Semantic NLI | Similar clauses with different wording | Needs entailment/contradiction classification |
| Citation | "Section 14 of PECA" | Needs legal reference resolution |
| Precedence | Special law vs general law | Needs legal hierarchy rules |

The project therefore uses specialist routes.

## Planned Input Sources

The backend should support:

- Pakistani statutes
- Amendments
- Case law references
- User-uploaded repository documents
- Single draft clauses
- Multi-file comparison uploads

## Offline Data Pipeline

The offline pipeline prepares legal data before users run searches or checks.

1. Collect Pakistani legal documents.
2. Extract text from PDF, DOCX, TXT, or OCR documents.
3. Split documents into sections, clauses, and subclauses.
4. Extract metadata such as act name, section, year, jurisdiction, and version.
5. Normalize clauses into structured fields.
6. Generate synthetic clause pairs for training.
7. Apply weak automatic labels.
8. Review selected examples for quality.
9. Build vector indexes.
10. Build knowledge graph links.
11. Train or fine-tune specialist models.
12. Evaluate and version datasets.

## Online User Pipeline

The online pipeline runs when a user searches or checks a clause.

1. User submits query, draft clause, or document.
2. System authenticates request.
3. Text is extracted if a file is uploaded.
4. Clauses are segmented.
5. Clauses are normalized.
6. Relevant law or repository clauses are retrieved.
7. Candidate clause pairs are created.
8. Router checks which experts are needed.
9. Multiple experts run in parallel.
10. Results are merged.
11. Consistency reasoning is applied.
12. Confidence is calculated.
13. Explanation is generated.
14. Final report is returned.

## Planned Specialist Experts

| Expert | Proposed Tool / Model | Responsibility |
|---|---|---|
| Text Extraction | PaddleOCR + document parser | Extract text from PDFs, scans, DOCX, and TXT |
| Retrieval | BGE-M3 | Find relevant legal clauses |
| Reranking | BGE Reranker | Improve candidate order |
| Clause Router | DeBERTa-v3 | Decide which specialists are needed |
| Number Expert | Python Decimal | Exact amounts, percentages, limits, penalties |
| Date Expert | HeidelTime | Dates, deadlines, durations, amendment periods |
| Condition Expert | DeBERTa-v3 + Microsoft Z3 | If/unless clauses, exceptions, logical conditions |
| Deontic Expert | DeBERTa-v3 | Duties, permissions, prohibitions |
| Negation Expert | NegBERT | Negation cues and negation scope |
| Citation Expert | Legal-BERT NER + Neo4j | Sections, acts, references, amendments |
| Meaning Expert | DeBERTa-v3 Legal NLI | Entailment, contradiction, neutral |
| Legal Priority Expert | Drools + Neo4j | Special law, newer law, hierarchy |
| Consistency Reasoner | Drools + Microsoft Z3 | Merge evidence, resolve conflicts |
| Explanation Generator | FLAN-T5 | Generate grounded explanation from verified findings |

## Clause Routing Logic

Routing is multi-label. This means one clause may go to many experts at the same time.

Example:

> A person must appeal within 30 days unless the authority grants an extension.

This clause should route to:

- Date Expert because it contains "30 days".
- Deontic Expert because it contains "must".
- Condition Expert because it contains "unless".
- Meaning Expert because it must be compared with existing clauses.
- Legal Priority Expert if retrieved clauses include amendments or hierarchy conflicts.

## Conceptual Routing Pseudocode

```text
for each candidate_clause_pair:
    features = detect_features(candidate_clause_pair)
    routes = []

    if features.has_number_or_percentage:
        routes.add(NumberExpert)

    if features.has_date_or_deadline:
        routes.add(DateExpert)

    if features.has_condition_or_exception:
        routes.add(ConditionExpert)

    if features.has_deontic_terms:
        routes.add(DeonticExpert)

    if features.has_negation:
        routes.add(NegationExpert)

    if features.has_citation:
        routes.add(CitationExpert)

    if features.needs_semantic_comparison:
        routes.add(MeaningExpert)

    if features.has_priority_issue:
        routes.add(LegalPriorityExpert)

    expert_results = run_all(routes)
    merged = merge_results(expert_results)
    decision = consistency_reasoner(merged)
    report = explanation_generator(decision)
```

## Important Data Structures

### DocumentMetadata

```ts
type DocumentMetadata = {
  documentId: string;
  repositoryId?: string;
  title: string;
  sourceType: "statute" | "amendment" | "case_law" | "repository_document";
  jurisdiction?: string;
  actName?: string;
  year?: number;
  versionDate?: string;
  uploadedBy?: string;
};
```

### NormalizedClause

```ts
type NormalizedClause = {
  clauseId: string;
  documentId: string;
  originalText: string;
  normalizedText: string;
  subject?: string;
  action?: string;
  modality?: "duty" | "permission" | "prohibition" | "right";
  conditions: string[];
  exceptions: string[];
  quantities: string[];
  dates: string[];
  citations: string[];
};
```

### ExpertResult

```ts
type ExpertResult = {
  expertName: string;
  finding: "consistent" | "conflict" | "overlap" | "uncertain";
  confidence: number;
  evidence: string[];
  reasoningTrace: string[];
};
```

### AggregatedDecision

```ts
type AggregatedDecision = {
  finalStatus: "consistent" | "conflict" | "uncertain";
  severity: "high" | "medium" | "low";
  confidence: number;
  supportingExperts: string[];
  conflictingExperts: string[];
  evidence: string[];
};
```

## Conflict Decision Logic

The consistency reasoner should combine:

- NLI contradiction labels
- Numeric mismatches
- Date conflicts
- Citation relationships
- Exception rules
- Legal hierarchy
- Lex Specialis
- Lex Posterior
- Confidence values

The output should not simply be a model prediction. It should be a decision with evidence.

## Confidence Handling

The planned app does not require expert/manual review in the user flow.

If confidence is high:

- Return Consistent or Conflict.

If confidence is low:

- Mark result as Uncertain.
- Explain why the system is uncertain.
- Show the evidence that caused uncertainty.

## Explanation Rules

The explanation generator should only use verified outputs from:

- Retrieved clauses
- Expert findings
- Rule engine results
- Citation links
- Confidence calculation

It should not invent legal reasoning that is not supported by system evidence.

## Backend API Plan

Potential backend endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/repositories` | GET/POST | List or create repositories |
| `/api/repositories/{id}/files` | POST | Upload files |
| `/api/repositories/{id}/search` | POST | Search within repository |
| `/api/search/statutes` | POST | Search full legal corpus |
| `/api/analyze/single` | POST | Analyze draft text or one document |
| `/api/analyze/multi` | POST | Analyze multiple uploaded documents |
| `/api/reports/{id}` | GET | Retrieve saved analysis report |

## Validation Metrics

The backend should be evaluated using:

- Retrieval Recall@20
- Reranking NDCG@5
- NLI macro F1
- Numeric exact-match accuracy
- Date extraction accuracy
- Citation correctness
- Router precision and recall
- Conflict detection accuracy
- Explanation faithfulness
- Calibration and uncertain-rate analysis

## Summary

The backend plan is a practical hybrid AI architecture. It uses transformer models where language understanding is needed and symbolic tools where exact legal reasoning is required. This makes the system more suitable for complex Pakistani legal consistency checking than a single LegalBERT or DeBERTa model.
