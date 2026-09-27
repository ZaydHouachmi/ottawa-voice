import { NextResponse } from "next/server";
import { extractFields, MissingKeyError } from "@/lib/extract";
import { handInHandForm, sanitizeFormSchema, type FormSchema } from "@/lib/schema";

export async function POST(req: Request) {
  let body: { text?: string; form?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }

  // No `form` = the Hand in Hand demo. A pasted form (the /any-form page)
  // arrives from the client, so it's re-validated here, never trusted as-is.
  let form: FormSchema = handInHandForm;
  if (body.form !== undefined) {
    const custom = sanitizeFormSchema(body.form);
    if (!custom) {
      return NextResponse.json({ error: "Invalid form" }, { status: 400 });
    }
    form = custom;
  }

  try {
    return NextResponse.json({ fields: await extractFields(text, form) });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json(
        { error: "Server is not configured with a Gemini API key" },
        { status: 500 },
      );
    }
    console.error("Gemini extraction failed:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}
