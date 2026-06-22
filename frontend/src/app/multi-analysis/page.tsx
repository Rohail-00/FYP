"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { analyzeMultipleFiles } from "@/lib/aiClient";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  Layers,
  CheckCircle2,
} from "lucide-react";

const MAX_FILES = 7;
const MIN_FILES = 2;
const ACCEPTED = [".pdf", ".docx", ".txt"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

interface UploadedFile {
  id: string;
  file: File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  return "📃";
}

export default function MultiAnalysisPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addFiles = (incoming: File[]) => {
    setError("");
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds the 10 MB limit.`);
      return;
    }

    const valid = incoming.filter((f) =>
      ACCEPTED_MIME.includes(f.type) ||
      ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    const combined = [...uploadedFiles];
    for (const f of valid) {
      if (combined.length >= MAX_FILES) break;
      // Avoid duplicates by name
      if (!combined.find((u) => u.file.name === f.name)) {
        combined.push({
          id: `mf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file: f,
        });
      }
    }

    if (incoming.length > 0 && valid.length === 0) {
      setError("Only PDF, DOCX, and TXT files are accepted.");
      return;
    }
    if (uploadedFiles.length + valid.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} files.`);
    }

    setUploadedFiles(combined.slice(0, MAX_FILES));
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (uploadedFiles.length < MIN_FILES) {
      setError(`Please upload at least ${MIN_FILES} files to compare.`);
      return;
    }
    setError("");
    setIsAnalyzing(true);
    sessionStorage.removeItem("paklaw_latest_analysis");
    try {
      const result = await analyzeMultipleFiles(
        uploadedFiles.map((item) => item.file),
        30
      );
      sessionStorage.setItem("paklaw_latest_analysis", JSON.stringify(result));
      router.push("/report");
    } catch (analysisError) {
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : "Multi-file analysis failed.";
      setError(`${message} Make sure the backend is running on port 8001.`);
      setIsAnalyzing(false);
    }
  };

  const slots = MAX_FILES - uploadedFiles.length;
  const canAnalyze = uploadedFiles.length >= MIN_FILES;

  return (
    <main className="main-content">
      <div
        className="container container-narrow"
        style={{ paddingTop: "3rem", paddingBottom: "4rem" }}
      >
        {/* ── Header ── */}
        <div className="mb-6">
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
            <Layers size={24} strokeWidth={2} />
            Multi-File Analysis
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Upload 2–7 documents and detect inconsistencies between them
            directly — no repository needed.
          </p>
        </div>

        <div className="card flex flex-col gap-6">
          {/* ── Drop Zone ── */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="form-label" style={{ fontWeight: 600, marginBottom: 0 }}>
                Upload Documents
              </label>
              <span
                style={{
                  fontSize: "0.78rem",
                  color:
                    uploadedFiles.length >= MAX_FILES
                      ? "var(--severity-medium)"
                      : "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {uploadedFiles.length} / {MAX_FILES} files
              </span>
            </div>

            <div
              className={`upload-dropzone ${dragOver ? "upload-dropzone-active" : ""}`}
              style={{
                borderColor: dragOver ? "var(--accent)" : undefined,
                background: dragOver ? "var(--bg-tertiary)" : undefined,
                opacity: uploadedFiles.length >= MAX_FILES ? 0.55 : 1,
                pointerEvents: uploadedFiles.length >= MAX_FILES ? "none" : "auto",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon">
                <Upload size={32} strokeWidth={1.5} style={{ margin: "0 auto" }} />
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {dragOver
                  ? "Drop files here"
                  : "Click to select or drag & drop files"}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.3rem",
                }}
              >
                PDF, DOCX, TXT · Max {MAX_FILES} files · Up to 10 MB each
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                multiple
                style={{ display: "none" }}
                onChange={handleInputChange}
              />
            </div>

            {slots > 0 && uploadedFiles.length > 0 && (
              <p
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                You can add {slots} more file{slots !== 1 ? "s" : ""}.
              </p>
            )}
          </div>

          {/* ── File List ── */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-col" style={{ gap: "0.5rem" }}>
              <p
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.1rem",
                }}
              >
                Selected Files
              </p>
              {uploadedFiles.map((uf, idx) => (
                <div
                  key={uf.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.65rem 1rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                    animation: "repoSlideIn 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "var(--bg-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>
                    {fileIcon(uf.file.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {uf.file.name}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {formatBytes(uf.file.size)}
                    </p>
                  </div>
                  <button
                    title="Remove file"
                    onClick={() => removeFile(uf.id)}
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

          {/* ── Validation hint ── */}
          {uploadedFiles.length > 0 && uploadedFiles.length < MIN_FILES && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--severity-medium-bg)",
                border: "1px solid var(--severity-medium-border)",
                fontSize: "0.82rem",
                color: "var(--severity-medium)",
              }}
            >
              <AlertCircle size={15} />
              <span>Add at least {MIN_FILES - uploadedFiles.length} more file to enable analysis.</span>
            </div>
          )}

          {canAnalyze && !error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--severity-low-bg)",
                border: "1px solid var(--severity-low-border)",
                fontSize: "0.82rem",
                color: "var(--severity-low)",
              }}
            >
              <CheckCircle2 size={15} />
              <span>
                {uploadedFiles.length} files ready — inconsistencies will be
                checked between these files only.
              </span>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--severity-high-bg)",
                border: "1px solid var(--severity-high-border)",
                fontSize: "0.82rem",
                color: "var(--severity-high)",
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Action Button ── */}
          <button
            id="analyze-multi-btn"
            className="btn btn-primary btn-full mt-2"
            disabled={isAnalyzing || !canAnalyze}
            onClick={handleAnalyze}
            style={{
              opacity: !canAnalyze ? 0.55 : 1,
              cursor: !canAnalyze ? "not-allowed" : "pointer",
            }}
          >
            {isAnalyzing ? (
              <>
                <span
                  className="spinner"
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Analysing Files...
              </>
            ) : (
              <>
                <FileText size={16} />
                Analyse for Inconsistencies
              </>
            )}
          </button>

          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: "-0.5rem",
            }}
          >
            Analysis is scoped exclusively to the files you upload here.
          </p>
        </div>
      </div>
    </main>
  );
}
