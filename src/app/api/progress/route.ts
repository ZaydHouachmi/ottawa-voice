import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth0 } from "@/lib/auth0";
import { sanitizeFormSchema, type FormSchema, type FormValues } from "@/lib/schema";

// One JSON blob per logged-in user, keyed by Auth0's stable user id (sub).
// Deliberately not a database - see ARCHITECTURE.md. The blob holds the Hand
// in Hand answers plus, separately, the last form pasted on /any-form and
// its answers, so neither page can overwrite the other's progress.
const DATA_DIR = path.join(process.cwd(), "data", "progress");

type CustomProgress = { form: FormSchema; fields: FormValues } | null;
type Stored = { version: 2; fields: FormValues; custom: CustomProgress };

function fileFor(userId: string) {
  // Auth0 user ids look like "auth0|abc123" or "google-oauth2|abc123" - the
  // "|" is not filesystem-safe on all platforms, so swap it for a dash.
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return path.join(DATA_DIR, `${safe}.json`);
}

function sanitizeValues(input: unknown): FormValues {
  const out: FormValues = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input).slice(0, 50)) {
    if (!/^[A-Za-z0-9_]{1,60}$/.test(key)) continue;
    if (typeof value === "string") out[key] = value.slice(0, 500);
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

function sanitizeCustom(input: unknown): CustomProgress {
  if (!input || typeof input !== "object") return null;
  const raw = input as { form?: unknown; fields?: unknown };
  const form = sanitizeFormSchema(raw.form);
  if (!form) return null;
  const allowed = new Set(form.fields.map((f) => f.key));
  const fields = Object.fromEntries(
    Object.entries(sanitizeValues(raw.fields)).filter(([k]) => allowed.has(k)),
  );
  return { form, fields };
}

async function load(userId: string): Promise<Stored> {
  try {
    const parsed = JSON.parse(await readFile(fileFor(userId), "utf8"));
    if (parsed && parsed.version === 2) {
      return { version: 2, fields: sanitizeValues(parsed.fields), custom: sanitizeCustom(parsed.custom) };
    }
    // Files written before pasted forms existed are just the Hand in Hand
    // answers object - still read them, so nobody loses saved progress.
    return { version: 2, fields: sanitizeValues(parsed), custom: null };
  } catch {
    return { version: 2, fields: {}, custom: null };
  }
}

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const stored = await load(session.user.sub);
  return NextResponse.json({ fields: stored.fields, custom: stored.custom });
}

// Body is either { fields } (Hand in Hand) or { custom } (the pasted form,
// or null to clear it). Each updates only its own half of the blob.
export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let body: { fields?: unknown; custom?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const stored = await load(session.user.sub);
  if ("fields" in body) stored.fields = sanitizeValues(body.fields);
  if ("custom" in body) stored.custom = sanitizeCustom(body.custom);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileFor(session.user.sub), JSON.stringify(stored, null, 2));

  return NextResponse.json({ ok: true });
}
