import { NextRequest, NextResponse } from "next/server";
import {
  decodeFields,
  deleteStorageObject,
  docPath,
  encodeFields,
  firestoreFetch,
  getFirebaseToken,
  getUidFromToken,
  type FirestoreDocument,
} from "@/lib/firebaseRest";

type RouteContext = {
  params: Promise<{ repoId: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function listFileDocs(token: string, uid: string, repoId: string) {
  const response = await firestoreFetch<{ documents?: FirestoreDocument[] }>(
    token,
    `users/${uid}/repositories/${repoId}/files`
  );
  return response.documents ?? [];
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const token = getFirebaseToken(req);
  const uid = token ? getUidFromToken(token) : null;
  if (!token || !uid) return unauthorized();

  const { repoId } = await params;

  try {
    const fileDocs = await listFileDocs(token, uid, repoId);

    await Promise.all(
      fileDocs.map(async (fileDoc) => {
        const fields = decodeFields(fileDoc);
        const storagePath = fields.storagePath;

        if (typeof storagePath === "string" && storagePath) {
          await deleteStorageObject(token, storagePath);
        }

        await firestoreFetch<void>(token, docPath(fileDoc), {
          method: "DELETE",
        });
      })
    );

    await firestoreFetch<void>(
      token,
      `users/${uid}/repositories/${repoId}`,
      { method: "DELETE" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/repos/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete repository." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const token = getFirebaseToken(req);
  const uid = token ? getUidFromToken(token) : null;
  if (!token || !uid) return unauthorized();

  const { repoId } = await params;

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name?.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string") {
    updates.description = body.description.trim();
  }

  const updateMask = Object.keys(updates)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");

  try {
    await firestoreFetch<void>(
      token,
      `users/${uid}/repositories/${repoId}?${updateMask}`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeFields(updates)),
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/repos/:id]", err);
    return NextResponse.json(
      { error: "Failed to update repository." },
      { status: 500 }
    );
  }
}
