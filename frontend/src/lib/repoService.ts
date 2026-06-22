import { auth } from "@/lib/firebase";

export interface RepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  files: RepoFile[];
}

export type UploadProgressCallback = (
  fileId: string,
  progress: number
) => void;

async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await idToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? `Repository request failed (${response.status}).`);
  }
  return data;
}

export async function fetchRepos(uid: string): Promise<Repository[]> {
  void uid;
  const data = await apiFetch<{ repos: Repository[] }>("/api/repos", {
    cache: "no-store",
  });
  return data.repos;
}

export async function createRepo(
  _uid: string,
  name: string,
  description: string
): Promise<Repository> {
  const data = await apiFetch<{ repo: Repository }>("/api/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return data.repo;
}

export async function deleteRepo(
  _uid: string,
  repoId: string
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/repos/${encodeURIComponent(repoId)}`, {
    method: "DELETE",
  });
}

export function uploadFile(
  _uid: string,
  repoId: string,
  file: File,
  onProgress?: UploadProgressCallback
): { tempId: string; promise: Promise<RepoFile> } {
  const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const promise = idToken().then(
    (token) =>
      new Promise<RepoFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `/api/repos/${encodeURIComponent(repoId)}/files`
        );
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(tempId, Math.min(progress, 99));
        };

        xhr.onerror = () => reject(new Error("Upload connection failed."));
        xhr.onload = () => {
          let data: { file?: RepoFile; error?: string } = {};
          try {
            data = JSON.parse(xhr.responseText) as typeof data;
          } catch {
            // The status-specific error below is clearer than a JSON parse error.
          }

          if (xhr.status < 200 || xhr.status >= 300 || !data.file) {
            reject(new Error(data.error ?? `Upload failed (${xhr.status}).`));
            return;
          }

          onProgress?.(tempId, 100);
          resolve(data.file);
        };

        const form = new FormData();
        form.append("file", file);
        xhr.send(form);
      })
  );

  return { tempId, promise };
}

export async function removeFile(
  _uid: string,
  repoId: string,
  fileId: string,
  storagePath: string
): Promise<void> {
  void storagePath;
  await apiFetch<{ ok: true }>(
    `/api/repos/${encodeURIComponent(repoId)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
}

export async function openRepoFile(
  repoId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const token = await idToken();
  const response = await fetch(
    `/api/repos/${encodeURIComponent(repoId)}/files/${encodeURIComponent(fileId)}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to open file.");
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
