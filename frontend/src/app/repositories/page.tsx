"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRepo } from "@/context/RepoContext";
import type { Repository } from "@/context/RepoContext";
import { openRepoFile } from "@/lib/repoService";
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
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ── Formatters ───────────────────────────────────────────────────────────────

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

function fileIcon(type: string): string {
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("text")) return "📃";
  return "📎";
}

// ── Upload progress bar ──────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        height: "4px",
        background: "var(--bg-tertiary)",
        borderRadius: "2px",
        overflow: "hidden",
        marginTop: "4px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--accent)",
          borderRadius: "2px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RepositoriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    repos,
    isLoading: reposLoading,
    uploads,
    createRepo,
    deleteRepo,
    addFilesToRepo,
    removeFileFromRepo,
    refreshRepos,
  } = useRepo();
  const router = useRouter();

  // ── local UI state ────────────────────────────────────────────────────────

  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRepoName.trim();
    if (!trimmed) { setCreateError("Repository name is required."); return; }
    if (repos.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setCreateError("A repository with this name already exists.");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const repo = await createRepo(trimmed, newRepoDesc.trim());
      setNewRepoName("");
      setNewRepoDesc("");
      setShowCreateForm(false);
      setExpandedRepos((prev) => new Set([...prev, repo.id]));
      showToast(`Repository "${repo.name}" created.`);
    } catch {
      setCreateError("Failed to create repository. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    setDeletingId(repoId);
    try {
      await deleteRepo(repoId);
      setConfirmDelete(null);
      showToast("Repository deleted.");
    } catch {
      showToast("Failed to delete repository.", false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = (repoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    addFilesToRepo(repoId, files);
    showToast(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`);
    if (fileInputRefs.current[repoId]) fileInputRefs.current[repoId]!.value = "";
  };

  const handleRemoveFile = async (repoId: string, fileId: string, storagePath: string) => {
    setRemovingFileId(fileId);
    try {
      await removeFileFromRepo(repoId, fileId, storagePath);
      showToast("File removed.");
    } catch {
      showToast("Failed to remove file.", false);
    } finally {
      setRemovingFileId(null);
    }
  };

  const handleOpenFile = async (repoId: string, fileId: string, fileName: string) => {
    setOpeningFileId(fileId);
    try {
      await openRepoFile(repoId, fileId, fileName);
    } catch {
      showToast("Failed to open file.", false);
    } finally {
      setOpeningFileId(null);
    }
  };

  const toggleExpand = (repoId: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  // ── In-flight uploads for a specific repo ─────────────────────────────────

  const repoUploads = (repoId: string) =>
    uploads.filter((u) => u.repoId === repoId);

  // ── Loading states ────────────────────────────────────────────────────────

  if (authLoading || !isAuthenticated) {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading session…</p>
        </div>
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="main-content">
      {/* ── Toast notification ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 500,
            background: toast.ok ? "var(--severity-low-bg)" : "var(--severity-high-bg)",
            border: `1px solid ${toast.ok ? "var(--severity-low-border)" : "var(--severity-high-border)"}`,
            color: toast.ok ? "var(--severity-low)" : "var(--severity-high)",
            padding: "0.75rem 1.25rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "var(--shadow-lg)",
            animation: "repoSlideIn 0.2s ease",
            maxWidth: "340px",
          }}
        >
          {toast.ok
            ? <CheckCircle2 size={15} />
            : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div
        className="container"
        style={{ maxWidth: "820px", paddingTop: "3rem", paddingBottom: "4rem" }}
      >
        {/* ── Page header ── */}
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
              Organise documents into repositories to scope consistency checks.
            </p>
          </div>

          <div className="flex items-center" style={{ gap: "0.5rem" }}>
            {/* Refresh */}
            <button
              id="refresh-repos-btn"
              className="btn btn-secondary"
              title="Refresh"
              style={{ padding: "0.5rem 0.7rem" }}
              onClick={() => refreshRepos()}
              disabled={reposLoading}
            >
              <RefreshCw
                size={15}
                style={{
                  animation: reposLoading ? "spin 1s linear infinite" : "none",
                }}
              />
            </button>

            {/* New repo */}
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
        </div>

        {/* ── Create form ── */}
        {showCreateForm && (
          <div
            className="card mb-6"
            style={{
              animation: "repoSlideIn 0.2s ease",
              borderColor: "var(--accent)",
              borderWidth: "1.5px",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
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
                  onChange={(e) => { setNewRepoName(e.target.value); setCreateError(""); }}
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
                <p style={{ color: "var(--severity-high)", fontSize: "0.82rem", fontWeight: 500 }}>
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
                  style={{
                    padding: "0.55rem 1.1rem",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  disabled={creating}
                >
                  {creating && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  {creating ? "Creating…" : "Create Repository"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {reposLoading && repos.length === 0 && (
          <div
            className="card text-center"
            style={{ padding: "4rem 2rem", color: "var(--text-muted)" }}
          >
            <Loader2
              size={32}
              style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }}
            />
            <p style={{ fontSize: "0.85rem" }}>Loading your repositories…</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!reposLoading && repos.length === 0 && (
          <div
            className="card text-center"
            style={{ padding: "4rem 2rem", color: "var(--text-muted)" }}
          >
            <FolderOpen size={56} strokeWidth={1} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              No repositories yet
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              Create a repository and upload your documents to scope analysis checks.
            </p>
          </div>
        )}

        {/* ── Repo cards ── */}
        <div className="flex flex-col" style={{ gap: "1rem" }}>
          {repos.map((repo: Repository) => {
            const isExpanded = expandedRepos.has(repo.id);
            const isConfirming = confirmDelete === repo.id;
            const isDeleting = deletingId === repo.id;
            const inFlightUploads = repoUploads(repo.id);
            const totalFiles = repo.files.length + inFlightUploads.length;

            return (
              <div
                key={repo.id}
                className="card"
                style={{ padding: 0, overflow: "hidden", transition: "var(--transition)" }}
              >
                {/* ── Card header ── */}
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
                  {/* Folder icon */}
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

                  {/* Name + meta */}
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
                      {totalFiles} file{totalFiles !== 1 ? "s" : ""} ·{" "}
                      Created {formatDate(repo.createdAt)}
                    </p>
                  </div>

                  {/* Action buttons — stop propagation so they don't toggle expand */}
                  <div
                    className="flex items-center"
                    style={{ gap: "0.5rem", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Add files */}
                    <button
                      id={`add-files-btn-${repo.id}`}
                      className="btn btn-secondary"
                      title="Add files"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem", gap: "0.3rem" }}
                      onClick={() => fileInputRefs.current[repo.id]?.click()}
                    >
                      <Upload size={13} />
                      Add Files
                    </button>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      multiple
                      style={{ display: "none" }}
                      ref={(el) => { fileInputRefs.current[repo.id] = el; }}
                      onChange={(e) => handleFileUpload(repo.id, e)}
                    />

                    {/* Delete */}
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
                        disabled={isDeleting}
                      >
                        {isDeleting
                          ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          : <Trash2 size={14} />
                        }
                      </button>
                    ) : (
                      <div className="flex items-center" style={{ gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Delete?</span>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.6rem",
                            fontSize: "0.75rem",
                            color: "var(--severity-high)",
                            borderColor: "var(--severity-high-border)",
                            background: "var(--severity-high-bg)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                          onClick={() => handleDeleteRepo(repo.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
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

                    {/* Chevron */}
                    <div style={{ color: "var(--text-muted)" }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── Description ── */}
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

                {/* ── Expanded file list ── */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-light)",
                      padding: "1rem 1.5rem",
                      background: "var(--bg-secondary)",
                      animation: "repoSlideIn 0.18s ease",
                    }}
                  >
                    {/* In-flight uploads */}
                    {inFlightUploads.length > 0 && (
                      <div className="flex flex-col" style={{ gap: "0.5rem", marginBottom: "0.75rem" }}>
                        {inFlightUploads.map((u) => (
                          <div
                            key={u.tempId}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              padding: "0.6rem 0.9rem",
                              background: "var(--bg-primary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-light)",
                              fontSize: "0.82rem",
                            }}
                          >
                            <div className="flex items-center" style={{ gap: "0.6rem" }}>
                              {u.error
                                ? <AlertCircle size={14} style={{ color: "var(--severity-high)", flexShrink: 0 }} />
                                : <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)", flexShrink: 0 }} />
                              }
                              <span
                                style={{
                                  flex: 1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  color: u.error ? "var(--severity-high)" : "var(--text-secondary)",
                                }}
                              >
                                {u.error ? u.error : u.fileName}
                              </span>
                              <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: "0.75rem" }}>
                                {u.error ? "Failed" : `${u.progress}%`}
                              </span>
                            </div>
                            {!u.error && <ProgressBar pct={u.progress} />}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Completed files */}
                    {repo.files.length === 0 && inFlightUploads.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <FileText size={32} strokeWidth={1} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                        <p>No files yet. Click &ldquo;Add Files&rdquo; to upload documents.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col" style={{ gap: "0.5rem" }}>
                        {repo.files.map((file) => (
                          <div
                            key={file.id}
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

                            {/* Authenticated local-file download */}
                            {file.downloadUrl && (
                              <button
                                type="button"
                                onClick={() => handleOpenFile(repo.id, file.id, file.name)}
                                disabled={openingFileId === file.id}
                                title="Open file"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: openingFileId === file.id ? "wait" : "pointer",
                                  color: "var(--text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0.2rem",
                                  borderRadius: "var(--radius-sm)",
                                  transition: "var(--transition)",
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                              >
                                {openingFileId === file.id
                                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                  : <ExternalLink size={14} />
                                }
                              </button>
                            )}

                            {/* Remove file */}
                            <button
                              title="Remove file"
                              onClick={() => handleRemoveFile(repo.id, file.id, file.storagePath)}
                              disabled={removingFileId === file.id}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: removingFileId === file.id ? "not-allowed" : "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0.2rem",
                                borderRadius: "var(--radius-sm)",
                                transition: "var(--transition)",
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => {
                                if (removingFileId !== file.id)
                                  e.currentTarget.style.color = "var(--severity-high)";
                              }}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                              {removingFileId === file.id
                                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                : <X size={15} />
                              }
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
