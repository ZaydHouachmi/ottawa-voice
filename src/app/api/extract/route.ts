import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { handInHandForm, type FormValues } from "@/lib/schema";

// Constructed per-request, not at module load, so a missing key fails the
// request cleanly instead of crashing the whole route at build/boot time.
function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

function buildJsonSchema() {
  const properties: Record<string, { type: string[]; description: string }> = {};
  const required: string[] = [];
  for (const field of handInHandForm.fields) {
    // IMPORTANT: every field is schema-`required` and type-nullable, even
    // though the product behavior we want is "omit fields not mentioned".
    // Discovered by testing (see scripts/debug-extract.mjs): with an
    // all-optional schema, gemini-3.8-flash's extended-thinking mode
    // frequently reasons about every field internally, then only writes
    // ONE field to the visible output and stops — silently dropping the
    // rest. Forcing every key to be present (using null for "not
    // mentioned") makes the model actually consider each field instead of
    // stopping early. We strip the nulls back out below, after the call,
    // so the client-facing contract — only mentioned fields present — is
    // unchanged. Do not "simplify" this back to an optional schema.
    properties[field.key] = {
      type: [field.type === "text" ? "string" : "number", "null"],
      description: field.hint ? `${field.label} — ${field.hint}` : field.label,
    };
    required.push(field.key);
  }
  return { type: "object", properties, required };
}

function buildPrompt(text: string) {
  const fieldList = handInHandForm.fields
    .map((f) => `- ${f.key}: ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
    .join("\n");

  return `You are extracting form field values from something a person said out loud
or typed, for a form titled "${handInHandForm.title}".

Output a JSON object with EVERY field below present as a key. Check each
field independently. If the person actually stated a value for a field, use
it. If they did not mention that field at all, use null for it — never
guess or invent a value. The person may speak in any language; return
string values in the same language they used. Numbers should always be
plain digits with no currency symbols, commas, or units.

Fields:
${fieldList}

What the person said:
"""
${text}
"""`;
}

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }

  let client: GoogleGenAI;
  try {
    client = getClient();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured with a Gemini API key" },
      { status: 500 },
    );
  }

  try {
    const interaction = await client.interactions.create({
      model: "gemini-3.8-flash",
      input: buildPrompt(text),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: buildJsonSchema(),
      },
    });

    const raw = interaction.output_text;
    if (!raw) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw },
        { status: 502 },
      );
    }

    // Drop null/empty values so "not mentioned" reliably means "absent key",
    // never a null or empty-string field the UI would have to special-case.
    const fields: FormValues = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== "" && value !== undefined) {
        fields[key] = value as string | number;
      }
    }

    return NextResponse.json({ fields });
  } catch (err) {
    console.error("Gemini extraction failed:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}
