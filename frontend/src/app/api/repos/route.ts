import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUid } from "@/lib/firebaseServerAuth";
import {
  createRepository,
  listRepositories,
  LocalRepoError,
} from "@/lib/localRepoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof LocalRepoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const uid = await getAuthenticatedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ repos: await listRepositories(uid) });
  } catch (error) {
    return errorResponse(error, "Failed to fetch repositories.");
  }
}

export async function POST(req: NextRequest) {
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
  const description = body.description?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 422 });
  }
  if (name.length > 80 || description.length > 200) {
    return NextResponse.json(
      { error: "Repository name or description is too long." },
      { status: 422 }
    );
  }

  try {
    const repo = await createRepository(uid, name, description);
    return NextResponse.json({ repo }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create repository.");
  }
}
