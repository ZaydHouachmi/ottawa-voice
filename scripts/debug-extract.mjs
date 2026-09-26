import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";

// crude .env.local loader, no deps
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const text =
  "Hi, my name's Zayed Houachmi, I live at 123 Bank Street in Ottawa, I'm a student making about eighteen thousand a year, and I have one younger sibling I help support.";

async function run(label, { schema, prompt, extra = {} }) {
  console.log(`\n=== ${label} ===`);
  const interaction = await client.interactions.create({
    model: "gemini-3.8-flash",
    input: prompt,
    response_format: { type: "text", mime_type: "application/json", schema },
    ...extra,
  });
  console.log("thought_tokens:", interaction.usage?.total_thought_tokens);
  console.log("output_tokens:", interaction.usage?.total_output_tokens);
  console.log("output_text:", interaction.output_text);
}

// A: force all fields "required" — does that stop early cutoff?
await run("A: required fields", {
  schema: {
    type: "object",
    properties: {
      fullName: { type: "string", description: "Full name" },
      address: { type: "string", description: "Address" },
      dependents: { type: "number", description: "Number of dependents" },
      annualIncome: { type: "number", description: "Annual household income" },
    },
    required: ["fullName", "address", "dependents", "annualIncome"],
  },
  prompt: `Extract these fields from the statement below. Output a JSON object with
ALL four keys. If a field truly was not mentioned, use null for it — but check
every field independently before deciding that.

Fields: fullName, address, dependents, annualIncome

Statement: """${text}"""`,
});

// B: same as our real route prompt, but with thinking budget forced low
await run("B: low thinking budget", {
  schema: {
    type: "object",
    properties: {
      fullName: { type: "string", description: "Full name" },
      address: { type: "string", description: "Address" },
      dependents: { type: "number", description: "Number of dependents" },
      annualIncome: { type: "number", description: "Annual household income" },
    },
  },
  prompt: `Extract these fields from the statement below. Check each field
independently: fullName, address, dependents, annualIncome. Only include a
key if that specific field was actually mentioned.

Statement: """${text}"""`,
  extra: { generation_config: { thinking_config: { thinking_budget: 0 } } },
});
