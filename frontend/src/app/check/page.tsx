"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRepo } from "@/context/RepoContext";
import { analyzeDraft, analyzeRepositoryDraft } from "@/lib/aiClient";
import { Database, AlertCircle } from "lucide-react";

const ACCEPTED = [".pdf", ".doc", ".docx", ".txt"];
const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function CheckPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { repos } = useRepo();
  const router = useRouter();

  // Repository selection
  const [selectedRepo, setSelectedRepo] = useState("none");

  // Form & upload state
  const [draftText, setDraftText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  
  // Submission indicator state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitBtnText, setSubmitBtnText] = useState("Analyze for Inconsistencies");

  // Speech typing state
  const [isListening, setIsListening] = useState(false);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mockPhrases = [
    "In accordance with federal regulations,",
    " the amendment proposed in Section 12",
    " shall be audited for constitutional alignment",
    " with all active statutes.",
  ];

  // Auth check redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Clean up speech interval on component unmount
  useEffect(() => {
    return () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File) => {
    setError("");
    const isAccepted =
      ACCEPTED_MIME.includes(file.type) ||
      ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isAccepted) {
      setError("Only PDF, DOCX, and TXT files are accepted.");
      setFileName(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds the 10 MB limit.");
      setFileName(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);

    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      file.text()
        .then((text) => {
          if (!draftText.trim()) setDraftText(text.trim());
        })
        .catch(() => {
          setError("TXT file was selected, but its text could not be read.");
        });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const toggleVoiceTyping = () => {
    if (!isListening) {
      setIsListening(true);
      let phraseIndex = 0;

      speechIntervalRef.current = setInterval(() => {
        if (phraseIndex < mockPhrases.length) {
          setDraftText((prev) => {
            const separator = prev && !prev.endsWith(" ") ? " " : "";
            return prev + separator + mockPhrases[phraseIndex];
          });
          phraseIndex++;
        } else {
          stopListening();
        }
      }, 1200);
    } else {
      stopListening();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!draftText.trim() && !selectedFile) {
      setError("Please provide either draft clause text or upload a document file.");
      return;
    }

    if (!draftText.trim()) {
      setError("PDF/DOCX direct extraction is not active on this page yet. Upload those files to a repository, or paste clause text here.");
      return;
    }

    setIsSubmitting(true);
    setSubmitBtnText("Running retrieval + model routing...");

    try {
      const activeRepo = repos.find((repo) => repo.id === selectedRepo);
      if (activeRepo && activeRepo.files.length === 0) {
        setError("Selected repository is empty. Upload files or switch back to all Pak Law PDFs.");
        setIsSubmitting(false);
        setSubmitBtnText("Analyze for Inconsistencies");
        return;
      }

      const result = activeRepo
        ? await analyzeRepositoryDraft(
            draftText.trim(),
            activeRepo.files.map((file) => ({
              id: file.id,
              name: file.name,
              type: file.type,
              downloadUrl: file.downloadUrl,
            })),
            activeRepo.name,
            5
          )
        : await analyzeDraft(draftText.trim(), 5);
      sessionStorage.setItem("paklaw_latest_analysis", JSON.stringify(result));
      router.push("/report");
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI backend is not reachable.";
      setError(`${message} Make sure backend/server.py is running on port 8001.`);
      setIsSubmitting(false);
      setSubmitBtnText("Analyze for Inconsistencies");
    }
  };

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
      <div className="container container-narrow" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="mb-6">
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Consistency Audit
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Input draft clauses to check against existing federal statutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-6">

          {/* ── Repository Selector ── */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.6rem",
              }}
            >
              <Database size={15} strokeWidth={2} style={{ color: "var(--accent)" }} />
              <label
                htmlFor="repo-select"
                className="form-label"
                style={{ fontWeight: 600, marginBottom: 0, fontSize: "0.85rem" }}
              >
                Knowledge Base
              </label>
            </div>
            <select
              id="repo-select"
              className="form-input"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{ fontSize: "0.88rem" }}
            >
              <option value="none">None — scan all Pak Law PDFs (default)</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  📁 {r.name}{r.files.length > 0 ? ` (${r.files.length} file${r.files.length !== 1 ? "s" : ""})` : " (empty)"}
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
              {selectedRepo === "none"
                ? "Analysis will run against all Pak Law PDFs in the system."
                : `Analysis will be scoped to the files in your selected repository.`}
            </p>
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-2" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <label htmlFor="draftText" className="form-label" style={{ fontWeight: 600, marginBottom: 0 }}>
                Draft Clause Text
              </label>
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`btn ${isListening ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  borderRadius: "var(--radius-md)",
                  height: "auto",
                  ...(isListening && {
                    backgroundColor: "#ef4444",
                    borderColor: "#ef4444",
                    color: "#ffffff",
                  }),
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: "var(--transition)" }}
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span>{isListening ? "Listening..." : "Voice Type"}</span>
              </button>
            </div>
            <textarea
              id="draftText"
              className="form-input form-textarea"
              placeholder="Paste the text of the proposed statutory amendment or clause here..."
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              required={!fileName}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Or Upload Document File
            </label>
            <div
              className={`upload-dropzone ${dragOver ? "upload-dropzone-active" : ""}`}
              style={{
                borderColor: dragOver ? "var(--accent)" : undefined,
                background: dragOver ? "var(--bg-tertiary)" : undefined,
              }}
              onClick={triggerFileInput}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📂</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                Click to select files or drag & drop here
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                PDF, DOCX, or TXT up to 10MB
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
            {fileName && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Selected file: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fileName}</span>
              </div>
            )}
          </div>

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

          <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-full mt-2">
            {submitBtnText}
          </button>
        </form>
      </div>
    </main>
  );
}
