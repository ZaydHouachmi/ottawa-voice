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
  const properties: Record<string, { type: string; description: string }> = {};
  for (const field of handInHandForm.fields) {
    properties[field.key] = {
      type: field.type === "text" ? "string" : "number",
      description: field.hint ? `${field.label} — ${field.hint}` : field.label,
    };
  }
  // Deliberately no `required` here — the whole point is partial extraction
  // from one utterance. A field the person didn't mention should be absent,
  // not a validation failure.
  return { type: "object", properties };
}

function buildPrompt(text: string) {
  const fieldList = handInHandForm.fields
    .map((f) => `- ${f.key}: ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
    .join("\n");

  return `You are extracting form field values from something a person said out loud
or typed, for a form titled "${handInHandForm.title}".

Only include a field if the person actually stated it. Never guess, infer, or
invent a value for something they did not mention — omit that key entirely
instead. The person may speak in any language; return string values in the
same language they used. Numbers should always be plain digits with no
currency symbols, commas, or units.

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
