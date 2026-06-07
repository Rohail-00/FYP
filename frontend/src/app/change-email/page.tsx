"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";

export default function ChangeEmailPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, email: currentEmail, changeEmail } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newEmail === currentEmail) { setError("New email must be different from your current email."); return; }
    setLoading(true);
    const result = await changeEmail(currentPassword, newEmail);
    setLoading(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error ?? "Failed to update email.");
    }
  };

  if (isLoading) return null;

  if (done) {
    return (
      <main className="main-content flex justify-between items-center"
        style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}>
        <Link href="/" style={{ fontSize: "1.75rem", fontWeight: 700, textDecoration: "none", color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Scale size={28} strokeWidth={2} /> PakLaw AI
        </Link>
        <div className="card container-narrow text-center">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
          <h1 className="card-title text-center">Verify your new email</h1>
          <p className="card-subtitle text-center">
            We sent a verification link to <strong>{newEmail}</strong>.<br />
            Click it to confirm the change. Your email won&apos;t update until you verify it.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-primary btn-full mt-6">
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content flex justify-between items-center"
      style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}>
      <Link href="/" style={{ fontSize: "1.75rem", fontWeight: 700, textDecoration: "none", color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Scale size={28} strokeWidth={2} /> PakLaw AI
      </Link>

      <div className="card container-narrow">
        <h1 className="card-title text-center">Change Email</h1>
        <p className="card-subtitle text-center">Enter your password to confirm your identity</p>

        {/* Current email info */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-muted)" }}>Current email: </span>
          <strong>{currentEmail}</strong>
        </div>

        {error && <p style={{ color: "var(--severity-high)", fontSize: "0.85rem", textAlign: "center", marginBottom: "0.5rem" }}>{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="newEmail" className="form-label">New Email Address</label>
            <input type="email" id="newEmail" className="form-input" placeholder="your-new@email.com"
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="currentPwd" className="form-label">Current Password</label>
            <input type="password" id="currentPwd" className="form-input" placeholder="••••••••"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? "Sending verification…" : "Send Verification Email"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>← Cancel and return Home</Link>
        </p>
      </div>
    </main>
  );
}
