"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface LawEntry {
  id: string;
  title: string;
  category: string;
  section: string;
  text: string;
  addedAt: string;
}

export default function AddLawPage() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("PPC");
  const [section, setSection] = useState("");
  const [text, setText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [laws, setLaws] = useState<LawEntry[]>([]);

  // Auth + admin guard
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "admin")) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, role, router]);

  // Load existing laws from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pak_laws_db");
    if (stored) setLaws(JSON.parse(stored));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newLaw: LawEntry = {
      id: "law-" + Date.now(),
      title: title.trim(),
      category,
      section: section.trim(),
      text: text.trim(),
      addedAt: new Date().toISOString(),
    };

    const updated = [...laws, newLaw];
    setLaws(updated);
    localStorage.setItem("pak_laws_db", JSON.stringify(updated));

    // Reset form
    setTitle("");
    setSection("");
    setText("");
    setSuccessMsg(`"${newLaw.title}" added to the database.`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleDelete = (id: string) => {
    const updated = laws.filter((l) => l.id !== id);
    setLaws(updated);
    localStorage.setItem("pak_laws_db", JSON.stringify(updated));
  };

  return (
    <main className="main-content">
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "4rem", maxWidth: "800px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>Add New Law</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Insert a new statute or section into the local database
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

        <div className="card" style={{ marginBottom: "2rem" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label htmlFor="lawTitle" className="form-label">Law Title</label>
              <input
                type="text"
                id="lawTitle"
                className="form-input"
                placeholder="e.g. Pakistan Penal Code — Section 302"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label htmlFor="lawCategory" className="form-label">Category</label>
                <select
                  id="lawCategory"
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="PPC">Pakistan Penal Code (PPC)</option>
                  <option value="PECA">PECA 2016</option>
                  <option value="Constitution">Constitution of Pakistan</option>
                  <option value="ATA">Anti-Terrorism Act</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="lawSection" className="form-label">Section / Article No.</label>
                <input
                  type="text"
                  id="lawSection"
                  className="form-input"
                  placeholder="e.g. 302, Article 25"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="lawText" className="form-label">Full Text</label>
              <textarea
                id="lawText"
                className="form-input form-textarea"
                placeholder="Paste the complete statute text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ minHeight: "180px" }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              Add to Database
            </button>
          </form>
        </div>

        {/* Recently added laws */}
        {laws.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Recently Added ({laws.length})
            </h2>
            <div className="flex flex-col gap-2">
              {[...laws].reverse().map((law) => (
                <div
                  key={law.id}
                  className="card flex justify-between items-center"
                  style={{ padding: "1rem 1.25rem" }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{law.title}</span>
                    <span
                      className="badge"
                      style={{
                        marginLeft: "0.75rem",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      {law.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(law.id)}
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
