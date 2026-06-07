import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/auth/lookup-email?name=John
// Returns the email for a given display name (case-insensitive)
// Runs server-side only — uses Admin SDK so Firestore rules don't apply
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name")?.trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const snap = await adminDb.collection("users").get();
    const match = snap.docs.find(
      (d) => (d.data().name as string)?.toLowerCase() === name.toLowerCase()
    );

    if (!match) {
      return NextResponse.json({ error: "No account found." }, { status: 404 });
    }

    return NextResponse.json({ email: match.data().email });
  } catch (err) {
    console.error("[lookup-email]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
