"use client";

import React, { useEffect, useState } from "react";
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
  const [resultLoaded, setResultLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("paklaw_latest_analysis");
      setAnalysis(stored ? (JSON.parse(stored) as AnalysisResult) : null);
    } catch {
      setAnalysis(null);
    } finally {
      setResultLoaded(true);
    }
  }, []);

  const getBadgeClass = (severity: ReportItem["severity"]) => {
    if (severity === "high") return "badge badge-high";
    if (severity === "medium") return "badge badge-medium";
    return "badge badge-low";
  };

  if (isLoading || !isAuthenticated || !resultLoaded) {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading analysis...</p>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className="main-content">
        <div
          className="container container-narrow text-center"
          style={{ paddingTop: "5rem", paddingBottom: "5rem" }}
        >
          <div className="card" style={{ padding: "3rem 2rem" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>
              No Analysis Result
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Run an inconsistency check before opening the report page.
            </p>
            <div className="flex justify-center" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/check" className="btn btn-secondary">
                Single Clause Check
              </Link>
              <Link href="/multi-analysis" className="btn btn-primary">
                Multi-File Analysis
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isMultiFile = analysis.summary.retrievalSource === "multi_file_pairwise";
  const newAnalysisHref = isMultiFile ? "/multi-analysis" : "/check";
  const dynamicReports: ReportItem[] = analysis.comparisons.map((item) => {
    const confidence = Math.round(item.decision.confidence * 100);
    const severity: ReportItem["severity"] =
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
    const source = item.sourceClause;
    const title = source
      ? `${source.title} vs ${item.candidate.title}`
      : `${item.candidate.title} - page ${item.candidate.pageStart}`;

    return {
      id: item.candidate.id,
      title,
      severity,
      badgeText,
      percentage: `${confidence}%`,
      shortDesc: item.decision.reasons.join("; "),
      proposedDraft: source?.text ?? analysis.draft,
      activeStatute: item.candidate.text,
      heuristics: `Experts: ${analysis.summary.routedExperts.join(", ")}. Signals: numeric mismatch=${item.decision.expertSignals?.numericMismatch ?? false}, negation mismatch=${item.decision.expertSignals?.negationMismatch ?? false}, date mismatch=${item.decision.expertSignals?.dateMismatch ?? false}, semantic overlap=${item.decision.expertSignals?.semanticOverlap ?? item.decision.semanticOverlap}. Sources: ${source?.file ?? "user draft"} vs ${item.candidate.file}.`,
    };
  });

  const filteredReports = dynamicReports.filter(
    (item) => filter === "all" || item.severity === filter
  );
  const highCount = dynamicReports.filter((item) => item.severity === "high").length;
  const mediumCount = dynamicReports.filter((item) => item.severity === "medium").length;
  const lowCount = dynamicReports.filter((item) => item.severity === "low").length;

  return (
    <main className="main-content">
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div
          className="flex justify-between items-center mb-6"
          style={{ flexWrap: "wrap", gap: "1rem" }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: "0.25rem",
              }}
            >
              Analysis Report
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Result from {analysis.summary.knowledgeBase ?? "PakLaw AI"}: {analysis.summary.candidateCount} comparison(s), {analysis.summary.contradictionCount} contradiction(s), confidence {Math.round(analysis.summary.confidence * 100)}%.
            </p>
          </div>
          <Link href={newAnalysisHref} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
            Run New Analysis
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
              {isMultiFile ? "Multi-file scan" : "Repository scan"}: {analysis.repositorySearch.chunkCount} searchable chunks
              {typeof analysis.repositorySearch.indexedFileCount === "number"
                ? ` from ${analysis.repositorySearch.indexedFileCount} file${analysis.repositorySearch.indexedFileCount === 1 ? "" : "s"}`
                : ""}
              {analysis.repositorySearch.failures.length
                ? `; ${analysis.repositorySearch.failures.length} file${analysis.repositorySearch.failures.length === 1 ? "" : "s"} failed extraction.`
                : "."}
            </p>
          )}

          {analysis.inputExtraction && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)",
              }}
            >
              <p style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Combined Input Extraction
              </p>
              <p style={{ marginTop: "0.35rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Typed text: {analysis.inputExtraction.typedTextCharacters} characters
                {analysis.inputExtraction.fileIncluded
                  ? `; ${analysis.inputExtraction.fileName}: ${analysis.inputExtraction.extractedCharacters} extracted characters`
                  : ""}
                ; combined input: {analysis.inputExtraction.combinedCharacters} characters.
              </p>
              {typeof analysis.inputExtraction.pageCount === "number" && (
                <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  PDF pages: {analysis.inputExtraction.pageCount}; embedded-text pages: {analysis.inputExtraction.textPageCount ?? 0}; OCR pages: {analysis.inputExtraction.ocrAppliedPages.length}.
                </p>
              )}
              {analysis.inputExtraction.warnings.map((warning) => (
                <p
                  key={warning}
                  style={{ marginTop: "0.35rem", fontSize: "0.78rem", color: "var(--severity-medium)" }}
                >
                  {warning}
                </p>
              ))}
            </div>
          )}

          {analysis.multiFileAnalysis?.truncatedFiles.length ? (
            <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--severity-medium)" }}>
              Large documents were limited to the first 300 searchable chunks: {analysis.multiFileAnalysis.truncatedFiles.join(", ")}.
            </p>
          ) : null}

          {analysis.part2Pipeline && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.9rem" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Multi-Expert Trace
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
                    <p style={{ fontSize: "0.82rem", fontWeight: 600 }}>{trace.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      {trace.model} - {trace.status.replaceAll("_", " ")}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                      {trace.output}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="filter-bar">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All ({dynamicReports.length})
          </button>
          <button className={`filter-btn ${filter === "high" ? "active" : ""}`} onClick={() => setFilter("high")}>
            High ({highCount})
          </button>
          <button className={`filter-btn ${filter === "medium" ? "active" : ""}`} onClick={() => setFilter("medium")}>
            Medium ({mediumCount})
          </button>
          <button className={`filter-btn ${filter === "low" ? "active" : ""}`} onClick={() => setFilter("low")}>
            Low ({lowCount})
          </button>
        </div>

        {dynamicReports.length === 0 ? (
          <div className="card text-center" style={{ padding: "3rem 2rem" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.45rem" }}>
              No Comparable Clauses Found
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              The documents were processed, but no cross-file clause pairs passed the minimum similarity threshold.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="report-card" onClick={() => setSelectedReport(report)}>
                <div className="report-header">
                  <div>
                    <span className={getBadgeClass(report.severity)} style={{ marginBottom: "0.5rem" }}>
                      {report.badgeText} ({report.percentage})
                    </span>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{report.title}</h3>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
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
        )}
      </div>

      <div className={`modal-overlay ${selectedReport ? "active" : ""}`} onClick={() => setSelectedReport(null)}>
        <div className="modal-card" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setSelectedReport(null)}>
            &times;
          </button>
          {selectedReport && (
            <>
              <div className="modal-header">
                <span className={getBadgeClass(selectedReport.severity)}>
                  {selectedReport.badgeText} ({selectedReport.percentage})
                </span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.5rem" }}>
                  {selectedReport.title}
                </h2>
              </div>
              <div className="clause-comparison">
                <div className="clause-panel">
                  <strong>{isMultiFile ? "Source Clause" : "Draft Clause"}</strong>
                  <p>&quot;{selectedReport.proposedDraft}&quot;</p>
                </div>
                <div className="clause-panel">
                  <strong>{isMultiFile ? "Compared Clause" : "Retrieved Clause"}</strong>
                  <p>&quot;{selectedReport.activeStatute}&quot;</p>
                </div>
                <div style={{ gridColumn: "1 / -1", fontSize: "0.8rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem" }}>
                  <strong>Reasoning:</strong> {selectedReport.heuristics}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
