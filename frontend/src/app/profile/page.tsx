"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface AuditHistoryItem {
  id: string;
  date: string;
  docTitle: string;
  conflicts: number;
  status: "Passed" | "Action Required";
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading, name: authName, email: authEmail, updateDisplayName } = useAuth();
  const router = useRouter();

  // Profile fields state
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Senior Legal Auditor");
  const [department, setDepartment] = useState("Federal Law Review Division");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Toggle editor
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security preferences toggles
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock activity history data
  const history: AuditHistoryItem[] = [
    { id: "h1", date: "2026-05-20", docTitle: "Theft Amendment PPC 379", conflicts: 2, status: "Action Required" },
    { id: "h2", date: "2026-05-18", docTitle: "Cyber Crimes Ordinance PECA 14", conflicts: 1, status: "Action Required" },
    { id: "h3", date: "2026-05-10", docTitle: "E-Commerce Regulatory Draft v2", conflicts: 0, status: "Passed" },
    { id: "h4", date: "2026-04-29", docTitle: "Extortion Penal Amendment ATA 7", conflicts: 2, status: "Action Required" },
  ];

  // Auth check redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load profile details from localStorage
  useEffect(() => {
    if (isAuthenticated) {
      setName(authName || localStorage.getItem("pak_name") || "Law Officer");
      setDesignation(localStorage.getItem("pak_designation") || "Senior Legal Auditor");
      setDepartment(localStorage.getItem("pak_department") || "Federal Law Review Division");
      setAvatar(localStorage.getItem("pak_avatar") || null);
    }
  }, [isAuthenticated, authName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await updateDisplayName(name.trim());
    }
    localStorage.setItem("pak_name", name);
    localStorage.setItem("pak_designation", designation);
    localStorage.setItem("pak_department", department);
    if (avatar) {
      localStorage.setItem("pak_avatar", avatar);
    }
    
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1000);
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        
        {/* Profile Card Header */}
        <div className="card flex flex-col gap-6" style={{ marginBottom: "2rem" }}>
          <div className="flex items-center gap-6" style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
            {/* Avatar section */}
            <div style={{ position: "relative", cursor: "pointer" }} onClick={triggerAvatarUpload}>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Profile Avatar"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--border-light)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    border: "2px solid var(--border-light)",
                  }}
                >
                  ⚖️
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "var(--accent)",
                  color: "white",
                  fontSize: "0.65rem",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                }}
              >
                EDIT
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            <div style={{ flex: 1, minWidth: "200px" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{name}</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 550 }}>
                {designation} · {department}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Active Officer · {authEmail || "reviewer@paklaw.gov.pk"}
              </p>
            </div>

            <div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <form
              onSubmit={handleSave}
              className="flex flex-col gap-4"
              style={{
                borderTop: "1px dashed var(--border-light)",
                paddingTop: "1.5rem",
                marginTop: "0.5rem",
              }}
            >
              <div className="grid grid-2 gap-4">
                <div className="form-group">
                  <label htmlFor="editName" className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="editName"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDesignation" className="form-label">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    id="editDesignation"
                    className="form-input"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="editDept" className="form-label">
                  Department / Organization
                </label>
                <input
                  type="text"
                  id="editDept"
                  className="form-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                Save Profile Changes
              </button>
            </form>
          )}

          {saveSuccess && (
            <div
              style={{
                backgroundColor: "var(--severity-low-bg)",
                border: "1px solid var(--severity-low-border)",
                color: "var(--severity-low)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ✓ Profile settings updated successfully! Synchronizing...
            </div>
          )}
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-2 gap-6">
          
          {/* History Column */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>
              Audit Execution History
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Date</th>
                    <th style={{ padding: "0.5rem 0", color: "var(--text-secondary)" }}>Document</th>
                    <th style={{ padding: "0.5rem 0", textAlign: "right", color: "var(--text-secondary)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "0.75rem 0", color: "var(--text-muted)" }}>{item.date}</td>
                      <td style={{ padding: "0.75rem 0", fontWeight: 550 }}>{item.docTitle}</td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right" }}>
                        <span
                          className={`badge ${
                            item.status === "Passed" ? "badge-low" : "badge-medium"
                          }`}
                        >
                          {item.status} ({item.conflicts} conflicts)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settings & Preferences Column */}
          <div className="card flex flex-col gap-4">
            <h3 className="card-title" style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>
              Security & Notifications
            </h3>

            <div className="form-group flex justify-between items-center" style={{ marginBottom: 0 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: 0 }}>
                  Multi-Factor Authentication (MFA)
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Require code verify during credentials entry.
                </p>
              </div>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                style={{ width: "1.2rem", height: "1.2rem" }}
              />
            </div>

            <div
              className="form-group flex justify-between items-center"
              style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1rem", marginBottom: 0 }}
            >
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: 0 }}>
                  Email Notifications
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Receive prompt alert reports on finished checks.
                </p>
              </div>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: "1.2rem", height: "1.2rem" }}
              />
            </div>

            <div
              className="form-group flex justify-between items-center"
              style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1rem", marginBottom: 0 }}
            >
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: 0 }}>
                  Weekly Conflict Digest
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Summaries of all amendments run by your division.
                </p>
              </div>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                style={{ width: "1.2rem", height: "1.2rem" }}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border-light)",
                paddingTop: "1rem",
                marginTop: "0.5rem",
              }}
            >
              <button
                className="btn btn-secondary btn-full"
                onClick={() => router.push("/change-password")}
                style={{ fontSize: "0.85rem" }}
              >
                🔐 Change Account Password
              </button>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
