"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading session...</p>
        </div>
      </main>
    );
  }

  const isAdmin = role === "admin";

  return (
    <main className="main-content">
      <div className="container container-narrow" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div className="text-center mb-6">
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: "0.5rem" }}>
            {isAdmin ? "Admin Dashboard" : "Legal Consistency Checker"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {isAdmin
              ? "Manage laws, upload sources, and run consistency audits."
              : "Verify proposed amendments against active federal statutes."}
          </p>
        </div>

        <div className="card flex flex-col gap-4 mt-6">
          <div className={`grid ${isAdmin ? "grid-2" : "grid-2"} gap-4`}>
            {/* Shared: Check Consistency */}
            <Link
              href="/check"
              className="btn btn-secondary flex flex-col items-center justify-between"
              style={{ padding: "2rem", height: "160px", textDecoration: "none", textAlign: "center", borderRadius: "var(--radius-lg)" }}
            >
              <span style={{ fontSize: "1.5rem" }}>➕</span>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Check Consistency
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Paste draft text or upload files
              </span>
            </Link>

            {/* Shared: Analysis Report */}
            <Link
              href="/report"
              className="btn btn-secondary flex flex-col items-center justify-between"
              style={{ padding: "2rem", height: "160px", textDecoration: "none", textAlign: "center", borderRadius: "var(--radius-lg)" }}
            >
              <span style={{ fontSize: "1.5rem" }}>📋</span>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Analysis Report
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                View conflict checks and severity data
              </span>
            </Link>

            {/* Admin-only: Add New Law */}
            {isAdmin && (
              <Link
                href="/admin/add-law"
                className="btn btn-secondary flex flex-col items-center justify-between"
                style={{ padding: "2rem", height: "160px", textDecoration: "none", textAlign: "center", borderRadius: "var(--radius-lg)" }}
              >
                <span style={{ fontSize: "1.5rem" }}>📜</span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  Add New Law
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Insert a new statute into the database
                </span>
              </Link>
            )}

            {/* Admin-only: Upload Source PDF */}
            {isAdmin && (
              <Link
                href="/admin/upload-pdf"
                className="btn btn-secondary flex flex-col items-center justify-between"
                style={{ padding: "2rem", height: "160px", textDecoration: "none", textAlign: "center", borderRadius: "var(--radius-lg)" }}
              >
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  Upload Source PDF
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Upload legislative documents and files
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
