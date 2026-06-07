"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Scale } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        // Don't reveal whether the email exists — just show success either way
        setDone(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setLoading(false);
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
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. Check your spam folder if you don&apos;t see it.
          </p>
          <button onClick={() => router.push("/login")} className="btn btn-primary btn-full mt-6">
            Return to Sign In
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
        <h1 className="card-title text-center">Reset Password</h1>
        <p className="card-subtitle text-center">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {error && <p style={{ color: "var(--severity-high)", fontSize: "0.85rem", textAlign: "center", marginBottom: "0.5rem" }}>{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="resetEmail" className="form-label">Email address</label>
            <input
              type="email" id="resetEmail" className="form-input"
              placeholder="name@domain.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          <Link href="/login" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            ← Return to Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
