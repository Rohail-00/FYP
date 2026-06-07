"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { isAuthenticated, isLoading, name, email, updateDisplayName } = useAuth();
  const router = useRouter();

  const [editName, setEditName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (name) setEditName(name);
  }, [name]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="main-content">
        <div className="container text-center" style={{ paddingTop: "4rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
        </div>
      </main>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    const result = await updateDisplayName(editName.trim());
    setSaving(false);
    if (result.ok) {
      setSuccessMsg("Display name updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setError(result.error ?? "Failed to update name.");
    }
  };

  return (
    <main
      className="main-content flex justify-between items-center"
      style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}
    >
      <div className="card container-narrow">
        <h1 className="card-title text-center">Change Profile</h1>
        <p className="card-subtitle text-center">Update your display name</p>

        <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>Current email</p>
          <p style={{ fontWeight: 600 }}>{email}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">Display Name</label>
            <input
              type="text" id="displayName" className="form-input"
              value={editName} onChange={(e) => setEditName(e.target.value)}
              placeholder="Your display name" required
            />
          </div>
          {error && <p style={{ color: "var(--severity-high)", fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>

        {successMsg && (
          <p className="text-center mt-4" style={{ fontSize: "0.85rem", color: "var(--severity-low)" }}>
            ✓ {successMsg}
          </p>
        )}

        <p className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); router.back(); }}
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            ← Go Back
          </a>
        </p>
      </div>
    </main>
  );
}
