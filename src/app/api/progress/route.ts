import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth0 } from "@/lib/auth0";
import type { FormValues } from "@/lib/schema";

// One JSON blob per logged-in user, keyed by Auth0's stable user id (sub).
// Deliberately not a database - see ARCHITECTURE.md: auth exists solely to
// gate save/resume for the one form, nothing more. A file per user is the
// simplest thing that's actually correct for that scope.
const DATA_DIR = path.join(process.cwd(), "data", "progress");

function fileFor(userId: string) {
  // Auth0 user ids look like "auth0|abc123" or "google-oauth2|abc123" - the
  // "|" is not filesystem-safe on all platforms, so swap it for a dash.
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const raw = await readFile(fileFor(session.user.sub), "utf8");
    return NextResponse.json({ fields: JSON.parse(raw) as FormValues });
  } catch {
    // No saved progress yet - not an error, just nothing to resume.
    return NextResponse.json({ fields: {} });
  }
}

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let body: { fields?: FormValues };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileFor(session.user.sub), JSON.stringify(body.fields ?? {}, null, 2));

  return NextResponse.json({ ok: true });
}
