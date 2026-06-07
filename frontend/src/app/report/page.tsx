"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
