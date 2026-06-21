# NewStuff Documentation Index

This folder contains the new pipeline and reasoning material requested for PakLaw AI. These files are focused on the system design after clause normalization: embedding, retrieval, model classification/routing, consistency reasoning, result evaluation, and preservation of contradiction/consistency outputs.

## Files

| File | Purpose |
|---|---|
| `01_PART1_PIPELINE_CREATION.md` | Part 1 pipeline creation, 2-3 part division, dummy data, and frontend/prototype scope |
| `02_TRAINING_PIPELINE.md` | Offline training pipeline divided into phases and subtasks |
| `03_OPERATIONAL_PIPELINE.md` | Deployed runtime pipeline from user input to final explanation |
| `04_CLASSIFICATION_AND_MODEL_ROUTING.md` | How clauses are checked and routed to specialist models |
| `05_PROCESSING_AND_PROPOSITIONAL_LOGIC.md` | Complete processing categories: negation, numbers, dates, dependencies, multihop, propositional logic |
| `06_EVALUATION_MATRICES_AND_RESULT_PRESERVATION.md` | Evaluation types, metrics matrices, and contradiction/consistency preservation |
| `07_JUSTIFICATION_AND_DEBATE.md` | Justification, defense points, and likely supervisor debate answers |

## Core Sequence

The new design follows this main sequence:

```text
Data
-> Processing
-> Clause Normalization
-> Embedding
-> Retrieval
-> Model Classification / Routing
-> Specialist Analysis
-> Consistency Reasoning
-> Result Evaluation
-> Preserve Contradiction and Consistency Results
-> Explanation / Report
```

## Important Design Decision

The project should not route every clause to one model only. Routing must be multi-label. One clause can go to several experts at the same time.

Example:

```text
A person must appeal within 30 days unless the authority grants an extension.
```

This clause needs:

- Date handling
- Deontic handling
- Conditional logic handling
- Semantic comparison
- Possibly legal precedence handling

That is why the system uses routing plus specialist models instead of a single LegalBERT/DeBERTa-only design.
