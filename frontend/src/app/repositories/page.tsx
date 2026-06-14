"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRepo } from "@/context/RepoContext";
import { Repository } from "@/context/RepoContext";
import {
  FolderOpen,
  Plus,
  Trash2,
  FileText,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RepositoriesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { repos, createRepo, deleteRepo, addFilesToRepo, removeFileFromRepo } =
    useRepo();
  const router = useRouter();

  // Create repo form state
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Track which repo cards are expanded
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Per-repo file input refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleCreateRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      setCreateError("Repository name is required.");
      return;
    }
    if (repos.some((r) => r.name.toLowerCase() === newRepoName.trim().toLowerCase())) {
      setCreateError("A repository with this name already exists.");
      return;
    }
    const repo = createRepo(newRepoName, newRepoDesc);
    setNewRepoName("");
    setNewRepoDesc("");
    setCreateError("");
    setShowCreateForm(false);
    // Auto-expand the new repo
    setExpandedRepos((prev) => new Set([...prev, repo.id]));
  };

  const handleFileUpload = (repoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      addFilesToRepo(repoId, files);
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRefs.current[repoId]) {
      fileInputRefs.current[repoId]!.value = "";
    }
  };

  const toggleExpand = (repoId: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  };

  const fileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    return "📃";
  };

  return (
    <main className="main-content">
      <div
        className="container"
        style={{ maxWidth: "800px", paddingTop: "3rem", paddingBottom: "4rem" }}
      >
        {/* ── Page Header ── */}
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
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <Database size={24} strokeWidth={2} />
              My Repositories
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Organise your documents into repositories to scope consistency
              checks.
            </p>
          </div>
          <button
            id="create-repo-btn"
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <Plus size={16} />
            New Repository
          </button>
        </div>

        {/* ── Create Repo Form ── */}
        {showCreateForm && (
          <div
            className="card mb-6"
            style={{
              animation: "repoSlideIn 0.2s ease",
              borderColor: "var(--accent)",
              borderWidth: "1.5px",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Create New Repository
            </h2>
            <form onSubmit={handleCreateRepo} className="flex flex-col gap-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="repo-name" className="form-label">
                  Repository Name <span style={{ color: "var(--severity-high)" }}>*</span>
                </label>
                <input
                  id="repo-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. University Regulations, Company Policy"
                  value={newRepoName}
                  onChange={(e) => {
                    setNewRepoName(e.target.value);
                    setCreateError("");
                  }}
                  maxLength={80}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="repo-desc" className="form-label">
                  Description{" "}
                  <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <input
                  id="repo-desc"
                  type="text"
                  className="form-input"
                  placeholder="Brief description of what these documents cover"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  maxLength={200}
                />
              </div>
              {createError && (
                <p
                  style={{
                    color: "var(--severity-high)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                  }}
                >
                  {createError}
                </p>
              )}
              <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.55rem 1.1rem", fontSize: "0.85rem" }}
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                    setNewRepoName("");
                    setNewRepoDesc("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.55rem 1.1rem", fontSize: "0.85rem" }}
                >
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Empty State ── */}
        {repos.length === 0 && (
          <div
            className="card text-center"
            style={{ padding: "4rem 2rem", color: "var(--text-muted)" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              <FolderOpen size={56} strokeWidth={1} style={{ margin: "0 auto", opacity: 0.35 }} />
            </div>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              No repositories yet
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              Create a repository and upload your documents to scope analysis
              checks.
            </p>
          </div>
        )}

        {/* ── Repo Cards ── */}
        <div className="flex flex-col" style={{ gap: "1rem" }}>
          {repos.map((repo: Repository) => {
            const isExpanded = expandedRepos.has(repo.id);
            const isConfirming = confirmDelete === repo.id;

            return (
              <div
                key={repo.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  transition: "var(--transition)",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "1.25rem 1.5rem",
                    cursor: "pointer",
                    gap: "1rem",
                  }}
                  onClick={() => toggleExpand(repo.id)}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FolderOpen size={20} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        marginBottom: "0.1rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {repo.name}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {repo.files.length} file{repo.files.length !== 1 ? "s" : ""} ·{" "}
                      Created {formatDate(repo.createdAt)}
                    </p>
                  </div>
                  <div
                    className="flex items-center"
                    style={{ gap: "0.5rem", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Add Files */}
                    <button
                      id={`add-files-btn-${repo.id}`}
                      className="btn btn-secondary"
                      title="Add files"
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.78rem",
                        gap: "0.3rem",
                      }}
                      onClick={() => fileInputRefs.current[repo.id]?.click()}
                    >
                      <Upload size={13} />
                      Add Files
                    </button>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      multiple
                      style={{ display: "none" }}
                      ref={(el) => {
                        fileInputRefs.current[repo.id] = el;
                      }}
                      onChange={(e) => handleFileUpload(repo.id, e)}
                    />

                    {/* Delete repo */}
                    {!isConfirming ? (
                      <button
                        id={`delete-repo-btn-${repo.id}`}
                        className="btn btn-secondary"
                        title="Delete repository"
                        style={{
                          padding: "0.4rem 0.6rem",
                          color: "var(--severity-high)",
                          borderColor: "var(--severity-high-border)",
                        }}
                        onClick={() => setConfirmDelete(repo.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center" style={{ gap: "0.35rem" }}>
                        <span
                          style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                        >
                          Delete?
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.6rem",
                            fontSize: "0.75rem",
                            color: "var(--severity-high)",
                            borderColor: "var(--severity-high-border)",
                            background: "var(--severity-high-bg)",
                          }}
                          onClick={() => {
                            deleteRepo(repo.id);
                            setConfirmDelete(null);
                          }}
                        >
                          Yes
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => setConfirmDelete(null)}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {/* Expand chevron */}
                    <div
                      style={{ cursor: "pointer", color: "var(--text-muted)" }}
                      onClick={() => toggleExpand(repo.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {repo.description && (
                  <div
                    style={{
                      padding: "0 1.5rem 0.75rem",
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                      borderTop: "1px solid var(--border-light)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    {repo.description}
                  </div>
                )}

                {/* Expanded: Files list */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-light)",
                      padding: "1rem 1.5rem",
                      background: "var(--bg-secondary)",
                      animation: "repoSlideIn 0.18s ease",
                    }}
                  >
                    {repo.files.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <FileText
                          size={32}
                          strokeWidth={1}
                          style={{ margin: "0 auto 0.5rem", opacity: 0.4 }}
                        />
                        <p>No files yet. Click &ldquo;Add Files&rdquo; to upload documents.</p>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col"
                        style={{ gap: "0.5rem" }}
                      >
                        {repo.files.map((file) => (
                          <div
                            key={file.id}
                            className="repo-file-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              padding: "0.6rem 0.9rem",
                              background: "var(--bg-primary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-light)",
                              fontSize: "0.82rem",
                            }}
                          >
                            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                              {fileIcon(file.type)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {file.name}
                              </p>
                              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                {formatBytes(file.size)} · {formatDate(file.uploadedAt)}
                              </p>
                            </div>
                            <button
                              title="Remove file"
                              onClick={() => removeFileFromRepo(repo.id, file.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0.2rem",
                                borderRadius: "var(--radius-sm)",
                                transition: "var(--transition)",
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color = "var(--severity-high)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = "var(--text-muted)")
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
