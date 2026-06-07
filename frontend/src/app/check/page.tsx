"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function CheckPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Form & upload state
  const [draftText, setDraftText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitBtnText("Running Neural-Symbolic Check...");

    setTimeout(() => {
      router.push("/report");
    }, 1500);
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
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Or Upload Document File
            </label>
            <div className="upload-dropzone" onClick={triggerFileInput}>
              <div className="upload-icon">📂</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                Click to select files or drag them here
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                PDF, DOCX, or TXT up to 10MB
              </div>
              <input
                type="file"
                ref={fileInputRef}
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

          <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-full mt-2">
            {submitBtnText}
          </button>
        </form>
      </div>
    </main>
  );
}
