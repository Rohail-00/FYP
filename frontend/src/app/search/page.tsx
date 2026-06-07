"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface LawItem {
  id: string;
  section: string;
  title: string;
  category: "PPC" | "PECA" | "Constitution" | "ATA" | "Civil";
  categoryName: string;
  text: string;
  notes: string;
  enactedYear: number;
}

export default function SearchPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null);

  const laws: LawItem[] = [
    {
      id: "law1",
      section: "PPC Section 378",
      title: "Theft Definition",
      category: "PPC",
      categoryName: "Pakistan Penal Code",
      text: "Whoever, intending to take dishonestly any moveable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft.",
      notes: "Requires proven dishonest intent and movement of moveable property out of physical possession.",
      enactedYear: 1860,
    },
    {
      id: "law2",
      section: "PPC Section 379",
      title: "Punishment for Theft",
      category: "PPC",
      categoryName: "Pakistan Penal Code",
      text: "Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.",
      notes: "Standard penal consequence for theft. Compoundable options depend on magistrate discretion.",
      enactedYear: 1860,
    },
    {
      id: "law3",
      section: "PECA Section 14",
      title: "Unauthorized Use of Identity",
      category: "PECA",
      categoryName: "Prevention of Electronic Crimes Act",
      text: "Whoever obtains, sells, possesses, transmits or uses another person's identity information without authorization shall be punished with imprisonment for a term which may extend to three years or with fine which may extend to five million rupees, or with both.",
      notes: "Encompasses digital fraud, phishing, fake accounts, and electronic identity misuse.",
      enactedYear: 2016,
    },
    {
      id: "law4",
      section: "PECA Section 20",
      title: "Offences Against Dignity of Natural Person",
      category: "PECA",
      categoryName: "Prevention of Electronic Crimes Act",
      text: "Whoever intentionally and publicly exhibits or transmits information which they know to be false, and which intimidates or harms the reputation of a natural person, commits cyber defamation.",
      notes: "Requires proven malicious intent and public exposure through online communication networks.",
      enactedYear: 2016,
    },
    {
      id: "law5",
      section: "Constitution Article 24",
      title: "Protection of Property Rights",
      category: "Constitution",
      categoryName: "Constitution of Pakistan",
      text: "No person shall be deprived of his property save in accordance with law. No property shall be compulsorily acquired or taken possession of save for a public purpose and by the authority of law which provides for compensation.",
      notes: "Fundamental rights clause protecting private property from unlawful state seizure or confiscation.",
      enactedYear: 1973,
    },
    {
      id: "law6",
      section: "Constitution Article 14",
      title: "Inviolability of Dignity of Man",
      category: "Constitution",
      categoryName: "Constitution of Pakistan",
      text: "The dignity of man and, subject to law, the privacy of home, shall be inviolable. No person shall be subjected to torture for the purpose of extracting evidence.",
      notes: "Constitutional protection of human rights and dignity, specifically prohibiting forced physical interrogation.",
      enactedYear: 1973,
    },
    {
      id: "law7",
      section: "ATA Section 7",
      title: "Punishment for Acts of Terrorism",
      category: "ATA",
      categoryName: "Anti-Terrorism Act",
      text: "Whoever commits an act of terrorism shall be punished with death or imprisonment for life, and shall also be liable to fine. Where the act results in grievous injury, imprisonment may extend to fourteen years.",
      notes: "ATA clauses supersede normal penal statutes whenever coercion, terror threat, or extortion elements exist.",
      enactedYear: 1997,
    },
  ];

  // Auth check redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Filter matching laws
  const filteredLaws = laws.filter((law) => {
    const matchesCategory = selectedCategory === "All" || law.category === selectedCategory;
    const matchesSearch =
      law.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.notes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getBadgeClass = (category: string) => {
    if (category === "Constitution") return "badge badge-high";
    if (category === "PECA" || category === "ATA") return "badge badge-medium";
    return "badge badge-low";
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
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="mb-6">
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Federal Statutes Search
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Look up active statutory clauses, sections, and penal code details.
          </p>
        </div>

        {/* Search Input */}
        <div className="form-group mb-6" style={{ maxWidth: "600px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by keywords, sections, or law titles (e.g. theft, Article 24)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: "0.85rem 1.25rem", fontSize: "0.95rem" }}
          />
        </div>

        {/* Category Filters */}
        <div className="filter-bar">
          {["All", "PPC", "PECA", "Constitution", "ATA"].map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "All" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div className="flex flex-col gap-4 mt-4">
          {filteredLaws.length > 0 ? (
            filteredLaws.map((law) => (
              <div key={law.id} className="report-card" onClick={() => setSelectedLaw(law)}>
                <div className="report-header">
                  <div>
                    <span className={getBadgeClass(law.category)} style={{ marginBottom: "0.5rem" }}>
                      {law.categoryName} ({law.enactedYear})
                    </span>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {law.section}: {law.title}
                    </h3>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLaw(law);
                    }}
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    View Details
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {law.text}
                </p>
              </div>
            ))
          ) : (
            <div className="card text-center" style={{ padding: "3rem" }}>
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "1rem" }}>🔍</span>
              <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No Statutes Found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Try adjusting your keyword query or switching filter categories.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Popup */}
      <div
        className={`modal-overlay ${selectedLaw ? "active" : ""}`}
        onClick={() => setSelectedLaw(null)}
      >
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setSelectedLaw(null)}>
            &times;
          </button>
          {selectedLaw && (
            <>
              <div className="modal-header">
                <div>
                  <span className={getBadgeClass(selectedLaw.category)}>
                    {selectedLaw.categoryName} — Enacted {selectedLaw.enactedYear}
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
                  {selectedLaw.section}: {selectedLaw.title}
                </h2>
              </div>
              <div className="clause-comparison" style={{ gridTemplateColumns: "1fr" }}>
                <div className="clause-panel" style={{ backgroundColor: "var(--bg-tertiary)", padding: "1.25rem" }}>
                  <strong>Statutory Provision Text</strong>
                  <p style={{ fontSize: "0.95rem", lineHeight: "1.6", fontStyle: "italic", color: "var(--text-primary)" }}>
                    &quot;{selectedLaw.text}&quot;
                  </p>
                </div>
                <div className="clause-panel">
                  <strong>Application & Notes</strong>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    {selectedLaw.notes}
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
