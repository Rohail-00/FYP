"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const result = await signup(fullname, email, password);
    setLoading(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error ?? "Signup failed.");
    }
  };

  if (done) {
    return (
      <main className="main-content flex justify-between items-center"
        style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}>
        <Link href="/" style={{ fontSize: "1.75rem", fontWeight: 700, textDecoration: "none", color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Scale size={28} strokeWidth={2} /> PakLaw AI
        </Link>
        <div className="card container-narrow text-center">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
          <h1 className="card-title text-center">Check your inbox</h1>
          <p className="card-subtitle text-center">
            We sent a verification link to <strong>{email}</strong>.<br />
            Click it to activate your account, then sign in.
          </p>
          <button onClick={() => router.push("/login")} className="btn btn-primary btn-full mt-6">
            Go to Sign In
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
        <h1 className="card-title text-center">Create an account</h1>
        <p className="card-subtitle text-center">Get started with automated statute consistency audits</p>

        {error && (
          <p style={{ color: "var(--severity-high)", fontSize: "0.85rem", textAlign: "center", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="fullname" className="form-label">Full name</label>
            <input type="text" id="fullname" className="form-input" placeholder="Your Name"
              value={fullname} onChange={(e) => setFullname(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input type="email" id="email" className="form-input" placeholder="name@domain.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input type="password" id="password" className="form-input" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
            <input type="password" id="confirmPassword" className="form-input" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-checkbox-group">
              <input type="checkbox" className="form-checkbox" checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)} required />
              {" "}I agree to the terms and privacy conditions
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
            Sign in instead
          </Link>
        </p>
      </div>
    </main>
  );
}
