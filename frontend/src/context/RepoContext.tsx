"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchRepos,
  createRepo as svcCreate,
  deleteRepo as svcDelete,
  uploadFile as svcUpload,
  removeFile as svcRemove,
  Repository,
  RepoFile,
} from "@/lib/repoService";

// ── Re-export types so page imports still work ──────────────────────────────
export type { Repository, RepoFile };

// ── Upload-progress tracking ─────────────────────────────────────────────────
export interface UploadEntry {
  tempId: string;
  fileName: string;
  repoId: string;
  progress: number; // 0-100
  error?: string;
}

// ── Context shape ────────────────────────────────────────────────────────────
interface RepoContextType {
  repos: Repository[];
  isLoading: boolean;
  uploads: UploadEntry[];         // in-flight uploads

  createRepo: (name: string, description: string) => Promise<Repository>;
  deleteRepo: (repoId: string) => Promise<void>;
  addFilesToRepo: (repoId: string, files: File[]) => void;
  removeFileFromRepo: (repoId: string, fileId: string, storagePath: string) => Promise<void>;
  refreshRepos: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────
const RepoContext = createContext<RepoContextType | undefined>(undefined);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const loadRepos = useCallback(async () => {
    if (!uid) { setRepos([]); return; }
    setIsLoading(true);
    try {
      const data = await fetchRepos(uid);
      setRepos(data);
    } catch (err) {
      console.error("[RepoContext] fetchRepos failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  // Reload repos whenever the signed-in user changes
  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const createRepo = useCallback(
    async (name: string, description: string): Promise<Repository> => {
      if (!uid) throw new Error("Not authenticated");
      const repo = await svcCreate(uid, name, description);
      setRepos((prev) => [repo, ...prev]);
      return repo;
    },
    [uid]
  );

  const deleteRepo = useCallback(
    async (repoId: string): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      await svcDelete(uid, repoId);
      setRepos((prev) => prev.filter((r) => r.id !== repoId));
    },
    [uid]
  );

  // ── File uploads ───────────────────────────────────────────────────────────

  const addFilesToRepo = useCallback(
    (repoId: string, files: File[]) => {
      if (!uid) return;

      files.forEach((file) => {
        const { tempId, promise } = svcUpload(
          uid,
          repoId,
          file,
          (tid, pct) => {
            setUploads((prev) =>
              prev.map((u) => (u.tempId === tid ? { ...u, progress: pct } : u))
            );
          }
        );

        // Register upload entry
        setUploads((prev) => [
          ...prev,
          { tempId, fileName: file.name, repoId, progress: 0 },
        ]);

        promise
          .then((repoFile: RepoFile) => {
            // Append new file into the right repo in state
            setRepos((prev) =>
              prev.map((r) =>
                r.id === repoId
                  ? { ...r, files: [...r.files, repoFile] }
                  : r
              )
            );
            // Remove upload entry
            setUploads((prev) => prev.filter((u) => u.tempId !== tempId));
          })
          .catch((err) => {
            console.error("[RepoContext] upload failed:", err);
            setUploads((prev) =>
              prev.map((u) =>
                u.tempId === tempId
                  ? { ...u, error: "Upload failed. Please retry." }
                  : u
              )
            );
          });
      });
    },
    [uid]
  );

  const removeFileFromRepo = useCallback(
    async (repoId: string, fileId: string, storagePath: string): Promise<void> => {
      if (!uid) throw new Error("Not authenticated");
      await svcRemove(uid, repoId, fileId, storagePath);
      setRepos((prev) =>
        prev.map((r) =>
          r.id === repoId
            ? { ...r, files: r.files.filter((f) => f.id !== fileId) }
            : r
        )
      );
    },
    [uid]
  );

  const refreshRepos = useCallback(() => loadRepos(), [loadRepos]);

  return (
    <RepoContext.Provider
      value={{
        repos,
        isLoading,
        uploads,
        createRepo,
        deleteRepo,
        addFilesToRepo,
        removeFileFromRepo,
        refreshRepos,
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
