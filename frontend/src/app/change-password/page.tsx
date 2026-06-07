"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (result.ok) {
      setSuccess("Password updated successfully!");
      setTimeout(() => router.push("/"), 1500);
    } else {
      setError(result.error ?? "Failed to update password.");
    }
  };

  if (isLoading) return null;

  return (
    <main className="main-content flex justify-between items-center"
      style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}>
      <Link href="/" style={{ fontSize: "1.75rem", fontWeight: 700, textDecoration: "none", color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Scale size={28} strokeWidth={2} /> PakLaw AI
      </Link>

      <div className="card container-narrow">
        <h1 className="card-title text-center">Change Password</h1>
        <p className="card-subtitle text-center">Enter your current password to confirm your identity</p>

        {error && <p style={{ color: "var(--severity-high)", fontSize: "0.85rem", textAlign: "center", marginBottom: "0.5rem" }}>{error}</p>}
        {success && <p style={{ color: "#10b981", fontSize: "0.85rem", textAlign: "center", marginBottom: "0.5rem" }}>{success}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="currentPwd" className="form-label">Current Password</label>
            <input type="password" id="currentPwd" className="form-input" placeholder="••••••••"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              required autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label htmlFor="newPwd" className="form-label">New Password</label>
            <input type="password" id="newPwd" className="form-input" placeholder="••••••••"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPwd" className="form-label">Confirm New Password</label>
            <input type="password" id="confirmPwd" className="form-input" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>← Cancel and return Home</Link>
        </p>
      </div>
    </main>
  );
}
