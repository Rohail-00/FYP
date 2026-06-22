import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUid } from "@/lib/firebaseServerAuth";
import {
  getRepositoryFile,
  LocalRepoError,
} from "@/lib/localRepoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ repoId: string; fileId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const uid = await getAuthenticatedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { repoId, fileId } = await params;
    const { record, absolutePath } = await getRepositoryFile(uid, repoId, fileId);
    const info = await stat(absolutePath);
    const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": record.type,
        "Content-Length": String(info.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(record.name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof LocalRepoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    console.error("Failed to download repository file:", error);
    return NextResponse.json(
      { error: "Failed to download file." },
      { status: 500 }
    );
  }
}
