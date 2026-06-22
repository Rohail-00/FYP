from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class ExpertTrace:
    name: str
    model: str
    status: str
    evidence: list[str]
    output: str


MODEL_REGISTRY = {
    "Numeric Expert": "regex + symbolic comparator; optional: google/flan-t5-base",
    "Temporal Expert": "dateparser + interval logic; optional: google/flan-t5-base",
    "Negation Expert": "rule cues + dependency parser; optional: joeddav/xlm-roberta-large-xnli",
    "Conditional Logic Expert": "rule parser + propositional checks; optional: z3-solver",
    "Deontic Expert": "modal verb classifier; optional: microsoft/deberta-v3-base",
    "Semantic NLI Expert": "optional: MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli",
    "Legal Context Expert": "citation/entity graph; optional: nlpaueb/legal-bert-base-uncased",
    "Explanation Expert": "template grounded explanation from verified expert outputs",
}


def build_part2_trace(
    draft_features: dict[str, Any],
    comparisons: list[dict[str, Any]],
) -> dict[str, Any]:
    traces: list[ExpertTrace] = []
    routed = set(draft_features.get("routedExperts", []))

    if "Numeric Expert" in routed:
        traces.append(
            ExpertTrace(
                name="Numeric Expert",
                model=MODEL_REGISTRY["Numeric Expert"],
                status="executed",
                evidence=list(draft_features.get("numbers", [])),
                output="Checked extracted amounts, limits, durations, percentages, and penalties for exact mismatch.",
            )
        )

    if "Temporal Expert" in routed:
        traces.append(
            ExpertTrace(
                name="Temporal Expert",
                model=MODEL_REGISTRY["Temporal Expert"],
                status="executed",
                evidence=list(draft_features.get("dates", [])),
                output="Checked dates, years, deadlines, and effective periods.",
            )
        )

    if "Negation Expert" in routed:
        traces.append(
            ExpertTrace(
                name="Negation Expert",
                model=MODEL_REGISTRY["Negation Expert"],
                status="executed",
                evidence=list(draft_features.get("negations", [])),
                output="Checked polarity changes caused by no, not, unless, except, shall not, and related cues.",
            )
        )

    if "Conditional Logic Expert" in routed:
        traces.append(
            ExpertTrace(
                name="Conditional Logic Expert",
                model=MODEL_REGISTRY["Conditional Logic Expert"],
                status="executed",
                evidence=list(draft_features.get("conditions", [])),
                output="Mapped if/unless/except/provided-that clauses into a simple propositional reasoning path.",
            )
        )

    if "Deontic Expert" in routed:
        traces.append(
            ExpertTrace(
                name="Deontic Expert",
                model=MODEL_REGISTRY["Deontic Expert"],
                status="executed",
                evidence=list(draft_features.get("deonticTerms", [])),
                output="Classified duties, permissions, prohibitions, liabilities, and obligations.",
            )
        )

    traces.append(
        ExpertTrace(
            name="Semantic NLI Expert",
            model=MODEL_REGISTRY["Semantic NLI Expert"],
            status="planned_model_fallback_active",
            evidence=[
                item["candidate"]["title"]
                for item in comparisons[:3]
                if item.get("candidate")
            ],
            output="Used retrieval overlap and rule decisions now; transformer NLI slot is ready for model installation.",
        )
    )

    traces.append(
        ExpertTrace(
            name="Legal Context Expert",
            model=MODEL_REGISTRY["Legal Context Expert"],
            status="planned_model_fallback_active",
            evidence=[
                item["candidate"]["file"]
                for item in comparisons[:3]
                if item.get("candidate")
            ],
            output="Preserved source law, page, and file provenance for future citation graph reasoning.",
        )
    )

    has_contradiction = any(
        item["decision"]["resultType"] == "contradiction"
        for item in comparisons
    )
    has_possible = any(
        item["decision"]["resultType"] == "possible_conflict"
        for item in comparisons
    )
    debate_summary = (
        "Contradiction preserved because at least one exact expert found a mismatch."
        if has_contradiction
        else "Possible conflict preserved for review because retrieved clauses overlap semantically."
        if has_possible
        else "No strong contradiction found; related clauses are preserved as supporting context."
    )

    return {
        "routerMode": "multi_label",
        "modelRegistry": MODEL_REGISTRY,
        "expertTrace": [asdict(trace) for trace in traces],
        "aggregation": {
            "strategy": "exact numeric/date/negation evidence outranks semantic overlap; all candidate decisions are preserved",
            "debateSummary": debate_summary,
        },
    }
