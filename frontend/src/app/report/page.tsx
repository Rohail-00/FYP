"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { AnalysisResult } from "@/lib/aiClient";

interface ReportItem {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  badgeText: string;
  percentage: string;
  shortDesc: string;
  proposedDraft: string;
  activeStatute: string;
  heuristics: string;
}

export default function ReportPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const reports: ReportItem[] = [
    {
      id: "detail1",
      title: "PPC Section 379: Punishment for Theft",
      severity: "high",
      badgeText: "High Conflict",
      percentage: "94.2%",
      shortDesc: "Direct contradiction regarding maximum imprisonment terms (5 years draft vs 3 years active statute).",
      proposedDraft:
        "...theft of property shall be punished with imprisonment of either description for a term which may extend to five years...",
      activeStatute:
        "Whoever commits theft shall be punished with imprisonment... for a term which may extend to three years...",
      heuristics: "Lex Posterior applies (newer provision), Lex Specialis not detected. No exemption tags.",
    },
    {
      id: "detail2",
      title: "PPC Section 378: Definition of Theft",
      severity: "high",
      badgeText: "High Conflict",
      percentage: "88.1%",
      shortDesc: "Overlap with primary definitions of movable property possession overrides.",
      proposedDraft: "...moves the asset with intent to permanently deprive the possessor thereof...",
      activeStatute:
        "Whoever, intending to take dishonestly any moveable property out of the possession of any person...",
      heuristics:
        "Scope overlap. Definition of 'asset' includes digital assets, whereas PPC refers to 'moveable property'.",
    },
    {
      id: "detail3",
      title: "PECA Section 14: Cyber-Enabled Theft",
      severity: "medium",
      badgeText: "Medium Overlap",
      percentage: "72.4%",
      shortDesc: "Potential domain overlap concerning electronic signatures and digital ledger transactions.",
      proposedDraft:
        "...unauthorised transfer of digital ledger certificates or balances by electronic credentials...",
      activeStatute:
        "Whoever commits electronic fraud or unauthorised access of data devices with intent to commit theft...",
      heuristics:
        "Lex Specialis applies (PECA is special law for cyber crimes). Recommending clarification references.",
    },
    {
      id: "detail4",
      title: "Anti-Terrorism Act, 1997 — Section 7",
      severity: "medium",
      badgeText: "Medium Overlap",
      percentage: "65.3%",
      shortDesc: "Possession of property by coercive or armed extortion groups.",
      proposedDraft: "...obtaining control of property under fear of instant physical injury to life or limb...",
      activeStatute:
        "Whoever commits an act of terrorism, extortion, or coercive acquisition of property by weapon-point...",
      heuristics:
        "Punitive discrepancies. ATA overrides normal penal codes where terror threat elements are established.",
    },
    {
      id: "detail5",
      title: "Constitution of Pakistan — Article 24",
      severity: "low",
      badgeText: "Low Exception",
      percentage: "45.0%",
      shortDesc: "Constitutional protections against unlawful deprivation of private property.",
      proposedDraft:
        "...confiscation of items acquired through unlawful or unauthorized access prior to conviction...",
      activeStatute: "No person shall be deprived of his property save in accordance with law...",
      heuristics:
        "Possible constitutional boundary issue. Ensure proper due process clauses are explicitly added.",
    },
  ];

  // Auth check redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("paklaw_latest_analysis");
      if (stored) setAnalysis(JSON.parse(stored) as AnalysisResult);
    } catch {
      setAnalysis(null);
    }
  }, []);

  const filteredReports = reports.filter((item) => {
    if (filter === "all") return true;
    return item.severity === filter;
  });

  const getBadgeClass = (severity: "high" | "medium" | "low") => {
    if (severity === "high") return "badge badge-high";
    if (severity === "medium") return "badge badge-medium";
    return "badge badge-low";
  };

  const highCount = reports.filter((r) => r.severity === "high").length;
  const mediumCount = reports.filter((r) => r.severity === "medium").length;
  const lowCount = reports.filter((r) => r.severity === "low").length;

  if (isLoading || !isAuthenticated) {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading session...</p>
        </div>
      </main>
    );
  }

  if (analysis) {
    const dynamicReports: ReportItem[] = analysis.comparisons.map((item) => {
      const confidence = Math.round(item.decision.confidence * 100);
      const severity =
        item.decision.resultType === "contradiction"
          ? "high"
          : item.decision.resultType === "possible_conflict"
            ? "medium"
            : "low";
      const badgeText =
        item.decision.resultType === "contradiction"
          ? "Contradiction"
          : item.decision.resultType === "possible_conflict"
            ? "Possible Conflict"
            : item.decision.resultType === "consistent_or_related"
              ? "Related/Consistent"
              : "Uncertain";

      return {
        id: item.candidate.id,
        title: `${item.candidate.title} — page ${item.candidate.pageStart}`,
        severity,
        badgeText,
        percentage: `${confidence}%`,
        shortDesc: item.decision.reasons.join("; "),
        proposedDraft: analysis.draft,
        activeStatute: item.candidate.text,
        heuristics: `Experts: ${analysis.summary.routedExperts.join(", ")}. Signals: numeric mismatch=${item.decision.expertSignals?.numericMismatch ?? false}, negation mismatch=${item.decision.expertSignals?.negationMismatch ?? false}, date mismatch=${item.decision.expertSignals?.dateMismatch ?? false}, semantic overlap=${item.decision.expertSignals?.semanticOverlap ?? item.decision.semanticOverlap}. Matrix: ${analysis.summary.evaluationMatrix}. Source: ${item.candidate.file}`,
      };
    });

    const dynamicFiltered = dynamicReports.filter((item) => {
      if (filter === "all") return true;
      return item.severity === filter;
    });
    const dynamicHigh = dynamicReports.filter((r) => r.severity === "high").length;
    const dynamicMedium = dynamicReports.filter((r) => r.severity === "medium").length;
    const dynamicLow = dynamicReports.filter((r) => r.severity === "low").length;

    return (
      <main className="main-content">
        <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
          <div className="flex justify-between items-center mb-6" style={{ flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                Analysis Report
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Real AI backend result from {analysis.summary.knowledgeBase ?? "Pakistan Code PDF Index"}: {analysis.summary.candidateCount} retrieved clauses, {analysis.summary.contradictionCount} contradiction(s), confidence {Math.round(analysis.summary.confidence * 100)}%.
              </p>
            </div>

            <Link href="/check" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
              Run New Check
            </Link>
          </div>

          <div className="card mb-6" style={{ padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Routed Experts
            </p>
            <div className="flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              {analysis.summary.routedExperts.map((expert) => (
                <span key={expert} className="badge badge-low">
                  {expert}
                </span>
              ))}
            </div>
            {analysis.repositorySearch && (
              <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Repository scan: {analysis.repositorySearch.chunkCount} searchable chunks
                {typeof analysis.repositorySearch.indexedFileCount === "number"
                  ? ` from ${analysis.repositorySearch.indexedFileCount} file${analysis.repositorySearch.indexedFileCount !== 1 ? "s" : ""}`
                  : ""}
                {analysis.repositorySearch.failures.length > 0
                  ? `; ${analysis.repositorySearch.failures.length} file${analysis.repositorySearch.failures.length !== 1 ? "s" : ""} could not be searched.`
                  : "."}
              </p>
            )}
            {analysis.part2Pipeline && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.9rem" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Part 2 Multi-Expert Trace
                </p>
                <div className="flex flex-col" style={{ gap: "0.5rem" }}>
                  {analysis.part2Pipeline.expertTrace.map((trace) => (
                    <div
                      key={`${trace.name}-${trace.status}`}
                      style={{
                        padding: "0.65rem 0.75rem",
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-secondary)",
                      }}
                    >
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {trace.name}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {trace.model} - {trace.status.replaceAll("_", " ")}
                      </p>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                        {trace.output}
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Aggregation:</strong>{" "}
                  {analysis.part2Pipeline.aggregation.debateSummary}
                </p>
              </div>
            )}
          </div>

          <div className="filter-bar">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All ({dynamicReports.length})
            </button>
            <button className={`filter-btn ${filter === "high" ? "active" : ""}`} onClick={() => setFilter("high")}>
              High ({dynamicHigh})
            </button>
            <button className={`filter-btn ${filter === "medium" ? "active" : ""}`} onClick={() => setFilter("medium")}>
              Medium ({dynamicMedium})
            </button>
            <button className={`filter-btn ${filter === "low" ? "active" : ""}`} onClick={() => setFilter("low")}>
              Low ({dynamicLow})
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {dynamicFiltered.map((report) => (
              <div key={report.id} className="report-card" onClick={() => setSelectedReport(report)}>
                <div className="report-header">
                  <div>
                    <span className={getBadgeClass(report.severity)} style={{ marginBottom: "0.5rem" }}>
                      {report.badgeText} ({report.percentage})
                    </span>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {report.title}
                    </h3>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    Details
                  </button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {report.shortDesc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`modal-overlay ${selectedReport ? "active" : ""}`} onClick={() => setSelectedReport(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedReport(null)}>
              &times;
            </button>
            {selectedReport && (
              <>
                <div className="modal-header">
                  <span className={getBadgeClass(selectedReport.severity)}>
                    {selectedReport.badgeText} ({selectedReport.percentage})
                  </span>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.5rem" }}>
                    {selectedReport.title}
                  </h2>
                </div>
                <div className="clause-comparison">
                  <div className="clause-panel">
                    <strong>Draft Clause</strong>
                    <p>&quot;{selectedReport.proposedDraft}&quot;</p>
                  </div>
                  <div className="clause-panel">
                    <strong>Retrieved Active Law Clause</strong>
                    <p>&quot;{selectedReport.activeStatute}&quot;</p>
                  </div>
                  <div style={{ gridColumn: "1 / -1", fontSize: "0.8rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Reasoning:</span>{" "}
                    {selectedReport.heuristics}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="flex justify-between items-center mb-6" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
              Analysis Report
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {reports.length} potential conflicts detected against reference statutes.
            </p>
          </div>

          <Link href="/check" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
            🔄 Run New Check
          </Link>
        </div>

        {/* Filter Buttons */}
        <div className="filter-bar">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({reports.length})
          </button>
          <button
            className={`filter-btn ${filter === "high" ? "active" : ""}`}
            onClick={() => setFilter("high")}
          >
            High Severity ({highCount})
          </button>
          <button
            className={`filter-btn ${filter === "medium" ? "active" : ""}`}
            onClick={() => setFilter("medium")}
          >
            Medium Overlap ({mediumCount})
          </button>
          <button
            className={`filter-btn ${filter === "low" ? "active" : ""}`}
            onClick={() => setFilter("low")}
          >
            Low Exception ({lowCount})
          </button>
        </div>

        {/* Report items list */}
        <div className="flex flex-col gap-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="report-card" onClick={() => setSelectedReport(report)}>
              <div className="report-header">
                <div>
                  <span className={getBadgeClass(report.severity)} style={{ marginBottom: "0.5rem" }}>
                    {report.badgeText} ({report.percentage})
                  </span>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {report.title}
                  </h3>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid double open triggers
                    setSelectedReport(report);
                  }}
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                >
                  Details
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{report.shortDesc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Detail Popup */}
      <div
        className={`modal-overlay ${selectedReport ? "active" : ""}`}
        onClick={() => setSelectedReport(null)}
      >
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setSelectedReport(null)}>
            &times;
          </button>
          {selectedReport && (
            <>
              <div className="modal-header">
                <div>
                  <span className={getBadgeClass(selectedReport.severity)}>
                    {selectedReport.badgeText} ({selectedReport.percentage})
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: "0.5rem",
                  }}
                >
                  {selectedReport.title}
                </h2>
              </div>
              <div className="clause-comparison">
                <div className="clause-panel">
                  <strong>Proposed Draft Amendment</strong>
                  <p>&quot;{selectedReport.proposedDraft}&quot;</p>
                </div>
                <div className="clause-panel">
                  <strong>Active Federal Statute</strong>
                  <p>&quot;{selectedReport.activeStatute}&quot;</p>
                </div>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "0.8rem",
                    borderTop: "1px solid var(--border-light)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Heuristics:</span>{" "}
                  {selectedReport.heuristics}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
