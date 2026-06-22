import { NextRequest, NextResponse } from "next/server";
import {
  decodeFields,
  deleteStorageObject,
  encodeFields,
  firestoreFetch,
  getFirebaseToken,
  getUidFromToken,
  type FirestoreDocument,
} from "@/lib/firebaseRest";

type RouteContext = {
  params: Promise<{ repoId: string; fileId: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const token = getFirebaseToken(req);
  const uid = token ? getUidFromToken(token) : null;
  if (!token || !uid) return unauthorized();

  const { repoId, fileId } = await params;
  const filePath = `users/${uid}/repositories/${repoId}/files/${fileId}`;
  const repoPath = `users/${uid}/repositories/${repoId}`;

  try {
    const fileDoc = await firestoreFetch<FirestoreDocument>(token, filePath);
    const fields = decodeFields(fileDoc);

    if (typeof fields.storagePath === "string" && fields.storagePath) {
      await deleteStorageObject(token, fields.storagePath);
    }

    await firestoreFetch<void>(token, filePath, { method: "DELETE" });

    await firestoreFetch<void>(
      token,
      `${repoPath}?updateMask.fieldPaths=updatedAt`,
      {
        method: "PATCH",
        body: JSON.stringify(encodeFields({ updatedAt: new Date() })),
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/repos/:repoId/files/:fileId]", err);
    return NextResponse.json(
      { error: "Failed to delete file." },
      { status: 500 }
    );
  }
}
