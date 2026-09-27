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
