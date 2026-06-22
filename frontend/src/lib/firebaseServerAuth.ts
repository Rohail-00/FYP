import { NextRequest } from "next/server";

type CachedToken = {
  uid: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/** Validate a Firebase ID token through Firebase Auth and return its user ID. */
export async function getAuthenticatedUid(
  req: NextRequest
): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.uid;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured.");
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      users?: Array<{ localId?: string }>;
    };
    const uid = data.users?.[0]?.localId;
    if (!uid) return null;

    tokenCache.set(token, {
      uid,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return uid;
  } catch (error) {
    console.error("Firebase token validation failed:", error);
    return null;
  }
}
