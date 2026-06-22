import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUid } from "@/lib/firebaseServerAuth";
import {
  addRepositoryFile,
  LocalRepoError,
} from "@/lib/localRepoStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ repoId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const uid = await getAuthenticatedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 422 });
    }

    const { repoId } = await params;
    const repoFile = await addRepositoryFile(uid, repoId, file);
    return NextResponse.json({ file: repoFile }, { status: 201 });
  } catch (error) {
    if (error instanceof LocalRepoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to store repository file:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
