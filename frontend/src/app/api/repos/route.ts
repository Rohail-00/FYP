import { NextRequest, NextResponse } from "next/server";
import {
  decodeFields,
  docId,
  encodeFields,
  firestoreFetch,
  getFirebaseToken,
  getUidFromToken,
  type FirestoreDocument,
} from "@/lib/firebaseRest";

type RepoFields = {
  name?: unknown;
  description?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type FileFields = {
  name?: unknown;
  size?: unknown;
  type?: unknown;
  storagePath?: unknown;
  downloadUrl?: unknown;
  uploadedAt?: unknown;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function listFiles(token: string, uid: string, repoId: string) {
  const response = await firestoreFetch<{ documents?: FirestoreDocument[] }>(
    token,
    `users/${uid}/repositories/${repoId}/files?orderBy=uploadedAt`
  );

  return (response.documents ?? []).map((doc) => {
    const fields = decodeFields(doc) as FileFields;
    return {
      id: docId(doc),
      name: asString(fields.name),
      size: typeof fields.size === "number" ? fields.size : 0,
      type: asString(fields.type, "application/octet-stream"),
      storagePath: asString(fields.storagePath),
      downloadUrl: asString(fields.downloadUrl),
      uploadedAt: asString(fields.uploadedAt, doc.updateTime ?? new Date().toISOString()),
    };
  });
}

export async function GET(req: NextRequest) {
  const token = getFirebaseToken(req);
  const uid = token ? getUidFromToken(token) : null;
  if (!token || !uid) return unauthorized();

  try {
    const response = await firestoreFetch<{ documents?: FirestoreDocument[] }>(
      token,
      `users/${uid}/repositories?orderBy=createdAt%20desc`
    );

    const repos = await Promise.all(
      (response.documents ?? []).map(async (doc) => {
        const fields = decodeFields(doc) as RepoFields;
        const id = docId(doc);
        const files = await listFiles(token, uid, id);

        return {
          id,
          name: asString(fields.name),
          description: asString(fields.description),
          createdAt: asString(fields.createdAt, doc.createTime ?? new Date().toISOString()),
          updatedAt: asString(fields.updatedAt, doc.updateTime ?? new Date().toISOString()),
          files,
        };
      })
    );

    return NextResponse.json({ repos });
  } catch (err) {
    console.error("[GET /api/repos]", err);
    return NextResponse.json(
      { error: "Failed to fetch repositories." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = getFirebaseToken(req);
  const uid = token ? getUidFromToken(token) : null;
  if (!token || !uid) return unauthorized();

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const description = body.description?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 422 });
  }

  try {
    const now = new Date();
    const doc = await firestoreFetch<FirestoreDocument>(
      token,
      `users/${uid}/repositories`,
      {
        method: "POST",
        body: JSON.stringify(
          encodeFields({
            name,
            description,
            createdAt: now,
            updatedAt: now,
          })
        ),
      }
    );

    return NextResponse.json(
      {
        repo: {
          id: docId(doc),
          name,
          description,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          files: [],
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/repos]", err);
    return NextResponse.json(
      { error: "Failed to create repository." },
      { status: 500 }
    );
  }
}
