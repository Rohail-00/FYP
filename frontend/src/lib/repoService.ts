/**
 * repoService.ts
 * ──────────────
 * All Firestore + Firebase-Storage operations for the Repository feature.
 *
 * Firestore schema
 * ────────────────
 * users/{uid}/repositories/{repoId}   ← repo metadata doc
 *   name        : string
 *   description : string
 *   createdAt   : Timestamp
 *   updatedAt   : Timestamp
 *
 * users/{uid}/repositories/{repoId}/files/{fileId}  ← file metadata sub-doc
 *   name        : string
 *   size        : number
 *   type        : string
 *   storagePath : string          ← Firebase Storage path
 *   downloadUrl : string          ← public download URL
 *   uploadedAt  : Timestamp
 *
 * Storage path
 * ────────────
 * repos/{uid}/{repoId}/{fileId}/{filename}
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

// ── Public types ─────────────────────────────────────────────────────────────

export interface RepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string; // ISO string
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  files: RepoFile[];
}

export type UploadProgressCallback = (fileId: string, progress: number) => void;

// ── Internal helpers ─────────────────────────────────────────────────────────

function reposCol(uid: string) {
  return collection(db, "users", uid, "repositories");
}

function repoDoc(uid: string, repoId: string) {
  return doc(db, "users", uid, "repositories", repoId);
}

function filesCol(uid: string, repoId: string) {
  return collection(db, "users", uid, "repositories", repoId, "files");
}

function fileDoc(uid: string, repoId: string, fileId: string) {
  return doc(db, "users", uid, "repositories", repoId, "files", fileId);
}

function toISO(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

// ── Repository CRUD ──────────────────────────────────────────────────────────

/** Fetch all repositories (with their files) for a user */
export async function fetchRepos(uid: string): Promise<Repository[]> {
  const reposSnap = await getDocs(
    query(reposCol(uid), orderBy("createdAt", "desc"))
  );

  const repos: Repository[] = [];

  for (const repoSnap of reposSnap.docs) {
    const data = repoSnap.data();

    const filesSnap = await getDocs(
      query(filesCol(uid, repoSnap.id), orderBy("uploadedAt", "asc"))
    );

    const files: RepoFile[] = filesSnap.docs.map((f) => {
      const fd = f.data();
      return {
        id: f.id,
        name: fd.name,
        size: fd.size,
        type: fd.type,
        storagePath: fd.storagePath,
        downloadUrl: fd.downloadUrl,
        uploadedAt: toISO(fd.uploadedAt),
      };
    });

    repos.push({
      id: repoSnap.id,
      name: data.name,
      description: data.description ?? "",
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
      files,
    });
  }

  return repos;
}

/** Create a new empty repository */
export async function createRepo(
  uid: string,
  name: string,
  description: string
): Promise<Repository> {
  const now = serverTimestamp();
  const docRef = await addDoc(reposCol(uid), {
    name: name.trim(),
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
  });

  const isoNow = new Date().toISOString();
  return {
    id: docRef.id,
    name: name.trim(),
    description: description.trim(),
    createdAt: isoNow,
    updatedAt: isoNow,
    files: [],
  };
}

/** Delete a repository and all its Storage files */
export async function deleteRepo(uid: string, repoId: string): Promise<void> {
  // 1. Fetch all file sub-docs so we can delete their Storage objects
  const filesSnap = await getDocs(filesCol(uid, repoId));

  await Promise.all(
    filesSnap.docs.map(async (f) => {
      const { storagePath } = f.data();
      // Delete from Storage (best-effort — don't fail the whole op if missing)
      try {
        await deleteObject(ref(storage, storagePath));
      } catch {
        /* file may already be gone */
      }
      // Delete Firestore sub-doc
      await deleteDoc(fileDoc(uid, repoId, f.id));
    })
  );

  // 2. Delete the repo doc itself
  await deleteDoc(repoDoc(uid, repoId));
}

// ── File operations ──────────────────────────────────────────────────────────

/**
 * Upload one File to Storage and write its metadata to Firestore.
 * Returns a Promise<RepoFile> that resolves when the upload is complete.
 * Calls `onProgress(tempId, 0-100)` while uploading.
 */
export function uploadFile(
  uid: string,
  repoId: string,
  file: File,
  onProgress?: UploadProgressCallback
): { tempId: string; promise: Promise<RepoFile> } {
  const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const fileRef = doc(filesCol(uid, repoId)); // auto-id Firestore doc
  const fileId = fileRef.id;
  const storagePath = `repos/${uid}/${repoId}/${fileId}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  const promise = new Promise<RepoFile>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(tempId, pct);
      },
      reject,
      async () => {
        try {
          const downloadUrl = await getDownloadURL(storageRef);
          const uploadedAt = serverTimestamp();

          await setDoc(fileRef, {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            storagePath,
            downloadUrl,
            uploadedAt,
          });

          // Bump repo updatedAt
          await setDoc(
            repoDoc(uid, repoId),
            { updatedAt: uploadedAt },
            { merge: true }
          );

          resolve({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            storagePath,
            downloadUrl,
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });

  return { tempId, promise };
}

/** Delete a single file from Storage + Firestore */
export async function removeFile(
  uid: string,
  repoId: string,
  fileId: string,
  storagePath: string
): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    /* already deleted */
  }
  await deleteDoc(fileDoc(uid, repoId, fileId));

  // Bump repo updatedAt
  await setDoc(
    repoDoc(uid, repoId),
    { updatedAt: serverTimestamp() },
    { merge: true }
  );
}
