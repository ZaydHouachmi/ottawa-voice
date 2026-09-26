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
      key: "dependents",
      label: "Number of dependents",
      type: "number",
      required: false,
      hint: "Children or dependents the applicant supports, not counting the applicant themselves",
    },
    {
      key: "annualIncome",
      label: "Annual household income",
      type: "currency",
      required: true,
      hint: "A yearly dollar figure. Strip currency symbols and commas, return a plain number.",
    },
  ],
};

/** Extracted values, keyed by FormField.key. Missing key = not yet provided. */
export type FormValues = Record<string, string | number>;
