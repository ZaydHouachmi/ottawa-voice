import { GoogleGenAI } from "@google/genai";
import type { FormSchema, FormValues } from "@/lib/schema";

// Shared by the web app (/api/extract) and the WhatsApp channel
// (/api/whatsapp), so both fill forms with exactly the same logic.

export class MissingKeyError extends Error {}

// Constructed per-request, not at module load, so a missing key fails the
// request cleanly instead of crashing the whole route at build/boot time.
function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new MissingKeyError("GOOGLE_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

function buildJsonSchema(form: FormSchema) {
  const properties: Record<string, { type: string[]; description: string }> = {};
  const required: string[] = [];
  for (const field of form.fields) {
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

function buildPrompt(text: string, form: FormSchema) {
  const fieldList = form.fields
    .map((f) => `- ${f.key}: ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
    .join("\n");

  return `You are extracting form field values from something a person said out loud
or typed, for a form titled "${form.title}".

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

/** Throws on timeout, model failure, or unparseable output. */
export async function extractFields(text: string, form: FormSchema): Promise<FormValues> {
  const client = getClient();

  // Race against a hard timeout. Measured directly: a normal successful
  // extraction takes ~5-6s; a rate-limit rejection specifically takes the
  // SDK ~30s+ to surface (it appears to retry internally before giving
  // up). 20s splits the difference - enough headroom that a legitimately
  // slow-but-working call isn't cut off, short enough that a live demo
  // never sits frozen for 30+ seconds waiting on a doomed request.
  const interaction = await Promise.race([
    client.interactions.create({
      model: "gemini-3.8-flash",
      input: buildPrompt(text, form),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: buildJsonSchema(form),
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out after 20s")), 20_000),
    ),
  ]);

  const raw = interaction.output_text;
  if (!raw) throw new Error("Empty response from model");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  // Drop null/empty values so "not mentioned" reliably means "absent key",
  // and only keep keys the form actually defines.
  const fields: FormValues = {};
  for (const field of form.fields) {
    const value = parsed[field.key];
    if (typeof value === "string" ? value.trim() !== "" : typeof value === "number") {
      fields[field.key] = value as string | number;
    }
  }
  return fields;
}
