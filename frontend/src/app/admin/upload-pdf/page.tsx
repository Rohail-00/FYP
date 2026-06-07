"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
}

export default function UploadPdfPage() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Auth + admin guard
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "admin")) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, role, router]);

  // Load uploaded files list from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pak_uploaded_files");
    if (stored) setUploads(JSON.parse(stored));
  }, []);

  if (isLoading || !isAuthenticated || role !== "admin") {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Verifying access...</p>
        </div>
      </main>
    );
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newUploads: UploadedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      newUploads.push({
        id: "file-" + Date.now() + "-" + i,
        name: file.name,
        size: formatSize(file.size),
        uploadedAt: new Date().toISOString(),
      });
    }

    const updated = [...uploads, ...newUploads];
    setUploads(updated);
    localStorage.setItem("pak_uploaded_files", JSON.stringify(updated));

    const count = newUploads.length;
    setSuccessMsg(`${count} file${count > 1 ? "s" : ""} uploaded successfully.`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDelete = (id: string) => {
    const updated = uploads.filter((f) => f.id !== id);
    setUploads(updated);
    localStorage.setItem("pak_uploaded_files", JSON.stringify(updated));
  };

  return (
    <main className="main-content">
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "4rem", maxWidth: "800px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>Upload Source PDF</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Upload legislative documents and source files for analysis
        </p>

        {successMsg && (
          <div
            style={{
              background: "var(--severity-low-bg)",
              border: "1px solid var(--severity-low-border)",
              color: "var(--severity-low)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {/* Drag-and-drop zone */}
        <div
          className="upload-dropzone"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            borderColor: isDragOver ? "var(--border-focus)" : undefined,
            background: isDragOver ? "var(--bg-primary)" : undefined,
            marginBottom: "2rem",
          }}
        >
          <div className="upload-icon">📁</div>
          <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
            Drag and drop files here, or click to browse
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            PDF, DOCX, TXT — up to 50 MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.doc"
            style={{ display: "none" }}
            onChange={(e) => processFiles(e.target.files)}
          />
        </div>

        {/* Uploaded files list */}
        {uploads.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Uploaded Files ({uploads.length})
            </h2>
            <div className="flex flex-col gap-2">
              {[...uploads].reverse().map((file) => (
                <div
                  key={file.id}
                  className="card flex justify-between items-center"
                  style={{ padding: "1rem 1.25rem" }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>📄 {file.name}</span>
                    <span style={{ marginLeft: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {file.size}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--severity-high)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
