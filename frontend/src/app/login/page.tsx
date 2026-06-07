"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once Firebase auth state confirms user is logged in, redirect to home
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);
    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error ?? "Invalid credentials.");
    }
  };

  return (
    <main
      className="main-content flex justify-between items-center"
      style={{ justifyContent: "center", padding: "3rem 1rem", flexDirection: "column", gap: "1.5rem", minHeight: "calc(100vh - 100px)" }}
    >
      <Link href="/" style={{ fontSize: "1.75rem", fontWeight: 700, textDecoration: "none", color: "var(--text-primary)", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Scale size={28} strokeWidth={2} /> PakLaw AI
      </Link>

      <div className="card container-narrow">
        <h1 className="card-title text-center">Sign in</h1>
        <p className="card-subtitle text-center">Access your PakLaw AI legal dashboard</p>

        {error && (
          <p style={{ color: "var(--severity-high)", fontSize: "0.85rem", textAlign: "center", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="identifier" className="form-label">Email or Username</label>
            <input
              type="text" id="identifier" className="form-input"
              placeholder="name@domain.com or username"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              required autoComplete="username"
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password" id="password" className="form-input" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
