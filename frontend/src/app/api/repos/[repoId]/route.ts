import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUid } from "@/lib/firebaseServerAuth";
import {
  deleteRepository,
  LocalRepoError,
  updateRepository,
} from "@/lib/localRepoStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ repoId: string }>;
};

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof LocalRepoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const uid = await getAuthenticatedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { repoId } = await params;
    await deleteRepository(uid, repoId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete repository.");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const uid = await getAuthenticatedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  if (!name && description === undefined) {
    return NextResponse.json({ error: "No updates supplied." }, { status: 422 });
  }

  try {
    const { repoId } = await params;
    const repo = await updateRepository(uid, repoId, { name, description });
    return NextResponse.json({ repo });
  } catch (error) {
    return errorResponse(error, "Failed to update repository.");
  }
}
