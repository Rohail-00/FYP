"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRepo } from "@/context/RepoContext";
import { searchLaws, searchRepositoryFiles, type SearchResult } from "@/lib/aiClient";
import { Database, Search, Loader2, AlertCircle, FileText } from "lucide-react";

export default function SearchPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { repos } = useRepo();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const searchRunRef = useRef(0);

  const activeRepo = repos.find((repo) => repo.id === selectedRepo);

  const resultCountText = useMemo(() => {
    const scope = activeRepo ? activeRepo.name : "Pakistan Code PDF index";
    if (!hasSearched) return `Search ${scope}.`;
    if (isSearching) return `Searching ${scope}...`;
    return `Showing ${results.length} indexed result${results.length !== 1 ? "s" : ""} from ${scope}.`;
  }, [activeRepo, hasSearched, isSearching, results.length]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const runSearch = async (query: string) => {
      const runId = searchRunRef.current + 1;
      searchRunRef.current = runId;
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        setError("");
        setWarning("");
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      setError("");
      setWarning("");

      try {
        const selected = repos.find((repo) => repo.id === selectedRepo);
        if (selected) {
          if (selected.files.length === 0) {
            if (runId !== searchRunRef.current) return;
            setError(`${selected.name} is empty. Upload files before searching this repository.`);
            setResults([]);
            return;
          }

          const data = await searchRepositoryFiles(
            q,
            selected.files.map((file) => ({
              id: file.id,
              name: file.name,
              type: file.type,
              downloadUrl: file.downloadUrl,
            })),
            12
          );
          if (runId !== searchRunRef.current) return;
          setResults(data.results);
          if (data.failures.length > 0) {
            setWarning(
              `${data.failures.length} file${data.failures.length !== 1 ? "s" : ""} could not be searched.`
            );
          }
          return;
        }

        const data = await searchLaws(q, 12);
        if (runId !== searchRunRef.current) return;
        setResults(data);
      } catch (err) {
        if (runId !== searchRunRef.current) return;
        const message = err instanceof Error ? err.message : "AI backend is not reachable.";
        setError(`${message} Start the stack with start_paklaw.py and try again.`);
        setResults([]);
      } finally {
        if (runId === searchRunRef.current) {
          setIsSearching(false);
        }
      }
    };

    const handle = window.setTimeout(() => {
      void runSearch(searchQuery);
    }, 350);

    return () => window.clearTimeout(handle);
  }, [searchQuery, selectedRepo, repos]);

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
        <div className="mb-6">
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "0.25rem",
            }}
          >
            Federal Statutes Search
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Search real clauses extracted from the Pakistan Code PDF corpus.
          </p>
        </div>

        <div
          className="card"
          style={{
            maxWidth: "820px",
            marginBottom: "1.5rem",
            padding: "1.25rem",
          }}
        >
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.6rem",
              }}
            >
              <Database size={16} strokeWidth={2} style={{ color: "var(--accent)" }} />
              <label
                htmlFor="search-repo-select"
                className="form-label"
                style={{ fontWeight: 600, marginBottom: 0 }}
              >
                Search Scope
              </label>
            </div>
            <select
              id="search-repo-select"
              className="form-input"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              <option value="all">All Pakistan Code PDFs</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                  {repo.files.length > 0
                    ? ` (${repo.files.length} file${repo.files.length !== 1 ? "s" : ""})`
                    : " (empty)"}
                </option>
              ))}
            </select>
            <p
              style={{
                marginTop: "0.45rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              {activeRepo
                ? `Search will run only inside files uploaded to ${activeRepo.name}.`
                : "Search runs against the indexed Pakistan Code corpus in PDF-Files."}
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="law-search-query" className="form-label">
              Clause, Section, Law Title, or Keyword
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={17}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                id="law-search-query"
                type="text"
                className="form-input"
                placeholder="e.g. punishment for theft, Article 24, child marriage, electronic crimes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.85rem 1.25rem 0.85rem 2.75rem",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex justify-between items-center mt-4"
          style={{ flexWrap: "wrap", gap: "0.5rem" }}
        >
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {resultCountText}
          </p>
          <span className="badge badge-low">
            {activeRepo ? "Repository Search" : "Pakistan Code Index"}
          </span>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          {!hasSearched && (
            <div className="card text-center" style={{ padding: "3rem" }}>
              <FileText
                size={42}
                strokeWidth={1.3}
                style={{ margin: "0 auto 1rem", color: "var(--text-muted)" }}
              />
              <h3 style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
                Search Pakistan Code
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Type at least two characters to search the indexed law PDFs.
              </p>
            </div>
          )}

          {isSearching && (
            <div className="card text-center" style={{ padding: "2.5rem", color: "var(--text-secondary)" }}>
              <Loader2
                size={28}
                style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }}
              />
              Searching indexed laws...
            </div>
          )}

          {error && (
            <div
              className="card"
              style={{
                padding: "1.25rem",
                color: "var(--severity-high)",
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {warning && !error && (
            <div
              className="card"
              style={{
                padding: "1rem 1.25rem",
                color: "var(--severity-medium)",
                borderColor: "var(--severity-medium-border)",
                background: "var(--severity-medium-bg)",
                fontSize: "0.85rem",
              }}
            >
              {warning}
            </div>
          )}

          {!isSearching && hasSearched && !error && results.length === 0 && (
            <div className="card text-center" style={{ padding: "3rem" }}>
              <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No Indexed Clauses Found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Try a broader legal term, section number, or law title.
              </p>
            </div>
          )}

          {!isSearching && !error && results.map((result) => (
            <div key={result.id} className="report-card" onClick={() => setSelectedResult(result)}>
              <div className="report-header">
                <div>
                  <span className="badge badge-low" style={{ marginBottom: "0.5rem" }}>
                    {activeRepo ? "Repository File" : "Pakistan Code PDF"} - Score {(result.score * 100).toFixed(1)}%
                  </span>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {result.title} - page {result.pageStart}
                  </h3>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResult(result);
                  }}
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                >
                  View Clause
                </button>
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {result.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`modal-overlay ${selectedResult ? "active" : ""}`}
        onClick={() => setSelectedResult(null)}
      >
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setSelectedResult(null)}>
            &times;
          </button>
          {selectedResult && (
            <>
              <div className="modal-header">
                <span className="badge badge-low">
                  {activeRepo ? "Repository File" : "Pakistan Code PDF"} - Score {(selectedResult.score * 100).toFixed(1)}%
                </span>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: "0.5rem",
                  }}
                >
                  {selectedResult.title} - page {selectedResult.pageStart}
                </h2>
              </div>
              <div className="clause-comparison" style={{ gridTemplateColumns: "1fr" }}>
                <div className="clause-panel" style={{ backgroundColor: "var(--bg-tertiary)", padding: "1.25rem" }}>
                  <strong>Retrieved Clause Text</strong>
                  <p style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "var(--text-primary)" }}>
                    {selectedResult.text}
                  </p>
                </div>
                <div className="clause-panel">
                  <strong>Source</strong>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    {selectedResult.file}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
