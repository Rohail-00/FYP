"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  User,
  Mail,
  Lock,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Scale,
  Menu,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout, name: contextName } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Profile");
  const [darkTheme, setDarkTheme] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Sync display name from context/localStorage
  useEffect(() => {
    if (isAuthenticated) {
      const storedName = contextName || localStorage.getItem("pak_name") || "Law Officer";
      setDisplayName(storedName);
    }
  }, [isAuthenticated, contextName]);

  // Read persisted theme on mount
  useEffect(() => {
    setDarkTheme(localStorage.getItem("pak_theme") === "dark");
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setIsSettingsOpen(false);
    logout();
    router.push("/login");
  };

  const toggleTheme = () => {
    const next = !darkTheme;
    setDarkTheme(next);
    if (next) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("pak_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("pak_theme", "light");
    }
  };

  const navigateTo = (path: string) => {
    setIsSettingsOpen(false);
    router.push(path);
  };


  // Shared dropdown item styling
  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.6rem 1rem",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    background: "none",
    border: "none",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "var(--transition)",
    fontFamily: "var(--font-sans)",
  };

  const dividerStyle: React.CSSProperties = {
    height: "1px",
    background: "var(--border-light)",
    margin: "0.35rem 0",
  };

  return (
    <nav className="nav-bar">
      <Link href="/" className="nav-brand">
        <Scale size={20} strokeWidth={2} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.35rem" }} />
        PakLaw AI
      </Link>
      <button
        className="nav-toggle"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <ul className={`nav-menu ${isMenuOpen ? "show" : ""}`}>
        {isAuthenticated ? (
          <>
            <li>
              <Link href="/" className={pathname === "/" ? "active" : ""}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/search" className={pathname === "/search" ? "active" : ""}>
                Search Laws
              </Link>
            </li>
            <li>
              <Link href="/repositories" className={pathname === "/repositories" ? "active" : ""}>
                My Repositories
              </Link>
            </li>
            <li>
              <Link href="/multi-analysis" className={pathname === "/multi-analysis" ? "active" : ""}>
                Multi-File Analysis
              </Link>
            </li>

            {/* Settings dropdown */}
            <li style={{ position: "relative" }} ref={dropdownRef}>
              <button
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className="settings-dropdown-trigger"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "none",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.45rem 0.85rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  transition: "var(--transition)",
                }}
              >
                <Settings size={15} strokeWidth={2} />
                <span>{displayName}</span>
                {isSettingsOpen ? <ChevronUp size={13} opacity={0.6} /> : <ChevronDown size={13} opacity={0.6} />}
              </button>

              {/* Dropdown panel */}
              {isSettingsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    minWidth: "220px",
                    padding: "0.5rem",
                    zIndex: 200,
                    animation: "dropdownFadeIn 0.15s ease",
                  }}
                >
                  {/* Header with role badge */}
                  <div style={{ padding: "0.5rem 1rem 0.6rem", borderBottom: "1px solid var(--border-light)", marginBottom: "0.35rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.1rem" }}>{displayName}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      User
                    </p>
                  </div>

                  {/* Dark Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {darkTheme ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
                    <span style={{ flex: 1 }}>{darkTheme ? "Light Mode" : "Dark Mode"}</span>
                    <span
                      style={{
                        width: "32px",
                        height: "18px",
                        borderRadius: "9px",
                        background: darkTheme ? "var(--accent)" : "var(--border-light)",
                        position: "relative",
                        flexShrink: 0,
                        transition: "var(--transition)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "white",
                          position: "absolute",
                          top: "2px",
                          left: darkTheme ? "16px" : "2px",
                          transition: "var(--transition)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      />
                    </span>
                  </button>

                  {/* Change Profile Name */}
                  <button
                    onClick={() => navigateTo("/settings")}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <User size={15} strokeWidth={2} />
                    <span>Change Profile</span>
                  </button>

                  {/* Change Email */}
                  <button
                    onClick={() => navigateTo("/change-email")}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Mail size={15} strokeWidth={2} />
                    <span>Change Email</span>
                  </button>

                  {/* Change Password */}
                  <button
                    onClick={() => navigateTo("/change-password")}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Lock size={15} strokeWidth={2} />
                    <span>Change Password</span>
                  </button>

                  <div style={dividerStyle} />

                  {/* Log Out */}
                  <button
                    onClick={handleSignOut}
                    style={{ ...itemStyle, color: "var(--severity-high)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--severity-high-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <LogOut size={15} strokeWidth={2} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </li>
          </>
        ) : (
          <>
            <li>
              <Link href="/login" className="nav-btn nav-btn-secondary">
                Sign In
              </Link>
            </li>
            <li>
              <Link href="/signup" className="nav-btn nav-btn-primary">
                Join
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};
