"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  files: RepoFile[];
}

interface RepoContextType {
  repos: Repository[];
  createRepo: (name: string, description: string) => Repository;
  deleteRepo: (repoId: string) => void;
  addFilesToRepo: (repoId: string, files: File[]) => void;
  removeFileFromRepo: (repoId: string, fileId: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const RepoContext = createContext<RepoContextType | undefined>(undefined);

function storageKey(uid: string) {
  return `pak_repos_${uid}`;
}

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);

  // Load from localStorage when user changes
  useEffect(() => {
    if (!user?.uid) {
      setRepos([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(user.uid));
      setRepos(raw ? JSON.parse(raw) : []);
    } catch {
      setRepos([]);
    }
  }, [user?.uid]);

  // Persist to localStorage on every change
  const persist = useCallback(
    (updated: Repository[]) => {
      if (!user?.uid) return;
      localStorage.setItem(storageKey(user.uid), JSON.stringify(updated));
      setRepos(updated);
    },
    [user?.uid]
  );

  const createRepo = useCallback(
    (name: string, description: string): Repository => {
      const repo: Repository = {
        id: `repo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        files: [],
      };
      persist([...repos, repo]);
      return repo;
    },
    [repos, persist]
  );

  const deleteRepo = useCallback(
    (repoId: string) => {
      persist(repos.filter((r) => r.id !== repoId));
    },
    [repos, persist]
  );

  const addFilesToRepo = useCallback(
    (repoId: string, files: File[]) => {
      const newFiles: RepoFile[] = files.map((f) => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: new Date().toISOString(),
      }));

      persist(
        repos.map((r) =>
          r.id === repoId ? { ...r, files: [...r.files, ...newFiles] } : r
        )
      );
    },
    [repos, persist]
  );

  const removeFileFromRepo = useCallback(
    (repoId: string, fileId: string) => {
      persist(
        repos.map((r) =>
          r.id === repoId
            ? { ...r, files: r.files.filter((f) => f.id !== fileId) }
            : r
        )
      );
    },
    [repos, persist]
  );

  return (
    <RepoContext.Provider
      value={{
        repos,
        createRepo,
        deleteRepo,
        addFilesToRepo,
        removeFileFromRepo,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used within a RepoProvider");
  return ctx;
};
