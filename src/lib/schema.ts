// The one form this project fills. See ARCHITECTURE.md — deliberately one
// form, not a form-picker. Do not add a second one before the deadline.

export type FieldType = "text" | "number" | "currency";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Extra guidance folded into the extraction prompt, not shown to the user. */
  hint?: string;
}

export interface FormSchema {
  id: string;
  title: string;
  /** Plain-language note on what real program this is modeled on. Shown in the UI footer. */
  modeledOn: string;
  fields: FormField[];
}

export const handInHandForm: FormSchema = {
  id: "hand-in-hand",
  title: "Hand in Hand — Recreation Fee Support",
  modeledOn:
    "Modeled on the shape of the City of Ottawa's Hand in Hand recreation and culture fee support program. Not a copy of the official form, and nothing here is submitted to the City.",
  fields: [
    { key: "fullName", label: "Full name", type: "text", required: true },
    { key: "address", label: "Address", type: "text", required: true },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "text",
      required: false,
      hint: "A phone number for the city to reach the applicant, if mentioned.",
    },
    {
      key: "email",
      label: "Email address",
      type: "text",
      required: false,
      hint: "An email address, if mentioned.",
    },
    {
      key: "dependents",
      label: "Number of dependents",
      type: "number",
      required: false,
      hint: "Children or dependents the applicant supports, not counting the applicant themselves",
    },
    {
      key: "householdSize",
      label: "Household size",
      type: "number",
      required: false,
      hint: "Total number of people living in the household, including the applicant - distinct from 'dependents' above, which excludes the applicant.",
    },
    {
      key: "annualIncome",
      label: "Annual household income",
      type: "currency",
      required: true,
      hint: "A yearly dollar figure. Strip currency symbols and commas, return a plain number.",
    },
    {
      key: "activityRequested",
      label: "Program requested",
      type: "text",
      required: false,
      hint: "The specific recreation or culture program/activity the applicant wants fee assistance for (e.g. swimming lessons, summer camp, gym membership), if mentioned.",
    },
  ],
};

/** Extracted values, keyed by FormField.key. Missing key = not yet provided. */
export type FormValues = Record<string, string | number>;

export const MAX_CUSTOM_FIELDS = 25;
const FIELD_TYPES: FieldType[] = ["text", "number", "currency"];

export function slugifyKey(label: string, index: number): string {
  const base = label
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("")
    .slice(0, 40);
  return `${base || "field"}_${index}`;
}

// A pasted form is untrusted input (it came from an arbitrary web page, via
// the client), so both the parse route's output and anything the client
// sends back to /api/extract go through this before reaching a prompt.
export function sanitizeFormSchema(input: unknown): FormSchema | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { title?: unknown; fields?: unknown };
  if (!Array.isArray(raw.fields) || raw.fields.length === 0) return null;

  const title =
    typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 120) : "Form";
  const seen = new Set<string>();
  const fields: FormField[] = [];
  for (const f of raw.fields.slice(0, MAX_CUSTOM_FIELDS)) {
    if (!f || typeof f !== "object") continue;
    const ff = f as Record<string, unknown>;
    const label = typeof ff.label === "string" ? ff.label.trim().slice(0, 120) : "";
    if (!label) continue;
    let key =
      typeof ff.key === "string" && /^[A-Za-z0-9_]{1,60}$/.test(ff.key)
        ? ff.key
        : slugifyKey(label, fields.length);
    if (seen.has(key)) key = slugifyKey(label, fields.length);
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({
      key,
      label,
      type: FIELD_TYPES.includes(ff.type as FieldType) ? (ff.type as FieldType) : "text",
      required: ff.required === true,
      hint: typeof ff.hint === "string" && ff.hint.trim() ? ff.hint.trim().slice(0, 200) : undefined,
    });
  }
  if (fields.length === 0) return null;
  return { id: "custom", title, modeledOn: "", fields };
}
