import { NextRequest } from "next/server";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const firestoreBase = projectId
  ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  : "";

export function getFirebaseToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export function getUidFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const data = JSON.parse(json) as { sub?: string; user_id?: string };
    return data.user_id ?? data.sub ?? null;
  } catch {
    return null;
  }
}

export function requireFirebaseConfig() {
  if (!projectId || !storageBucket) {
    throw new Error("Firebase projectId or storageBucket is not configured.");
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
}

export function encodeFields(input: Record<string, unknown>) {
  return {
    fields: Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, encodeValue(value)])
    ),
  };
}

function decodeValue(value?: FirestoreValue): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  return null;
}

export function decodeFields(doc: FirestoreDocument): Record<string, unknown> {
  const fields = doc.fields ?? {};
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)])
  );
}

export async function firestoreFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  requireFirebaseConfig();
  const res = await fetch(`${firestoreBase}/${path}`, {
    ...init,
    headers: {
      ...headers(token),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function deleteStorageObject(
  token: string,
  storagePath: string
): Promise<void> {
  requireFirebaseConfig();
  const encodedPath = encodeURIComponent(storagePath);
  const res = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Storage REST ${res.status}: ${text}`);
  }
}

export function docId(doc: FirestoreDocument): string {
  return doc.name.split("/").pop() ?? "";
}

export function docPath(doc: FirestoreDocument): string {
  return doc.name.split("/documents/").pop() ?? "";
}

export type { FirestoreDocument };
