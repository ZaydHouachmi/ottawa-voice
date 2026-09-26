# Ottawa Voice — System Design

*"Government forms, but you just talk."*

Written before any code exists. This is the plan-mode output — if a piece of
this turns out wrong once we're building, we fix the doc, not just the code,
so it stays true to what's actually running.

## The pitch, one sentence

You speak naturally about your situation; a real government form fills in
live in front of you, then reads itself back for confirmation.

## The flow

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  User speaks  │ --> │   Gemini     │ --> │  Form fields │
 │  OR types     │     │  extracts    │     │  populate    │
 └──────────────┘     │  structured  │     │  live in UI  │
                       │  fields      │     └──────┬───────┘
                       └──────────────┘            │
                                                    v
                       ┌──────────────┐     ┌──────────────┐
                       │  ElevenLabs  │ <-- │  User reviews │
                       │  reads it    │     │  confirms /   │
                       │  back        │     │  edits        │
                       └──────────────┘     └──────────────┘
```

Text input and voice input hit the **same** extraction function. Voice is a
layer on top of text, never a separate path. If the mic fails during judging,
you type, and the demo is identical from that point on. This is the single
most important architectural decision in the whole project — it is your
insurance policy against venue wifi and bad conference-room mics.

## The pieces

### 1. The form schema (hardcoded, not fetched)

One real government form (pick something short — a benefit application, a
permit request, a change-of-address). Modeled as a flat JSON object:

```json
{
  "fields": [
    { "key": "fullName", "label": "Full legal name", "type": "text", "required": true },
    { "key": "address", "label": "Current address", "type": "text", "required": true },
    { "key": "dependents", "label": "Number of dependents", "type": "number", "required": false },
    { "key": "annualIncome", "label": "Annual household income", "type": "currency", "required": true }
  ]
}
```

No database, no real form submission. The "output" is a filled summary you
could hand to a human. This is the scope cut that keeps the weekend survivable.

### 2. Extraction (Gemini)

One function: `extractFields(rawText: string, schema: FormSchema): Partial<FormData>`

Prompt Gemini with the schema and the raw utterance, ask for **structured
JSON output** matching the schema's keys. This is the core "AI feature" —
build and test it with typed text first, before voice ever enters the
picture. If this function is solid, everything downstream is plumbing.

### 3. Voice in (Web Speech API or a small recorder + Gemini's audio input)

Browser's built-in `SpeechRecognition` is the fastest path — zero backend
work, runs in Chrome out of the box. Falls back to the text box on any
browser that doesn't support it (Safari, some mobile). That fallback is not
a nice-to-have, it is required — do not discover it's missing at demo time.

### 4. Voice out (ElevenLabs)

Once fields are filled and confirmed, generate a short spoken summary:
*"Here's what I've got: full name Zayed Houachmi, address..., four
dependents. Say 'confirm' or tell me what to fix."*

One API call, one audio element. Do not build a conversational loop here —
a single generate-and-play is enough to qualify for the track and to land in
a three-minute demo.

### 5. Auth (Auth0)

Login gates a "save and resume" feature: the half-filled form persists per
user. This is the whole justification for auth existing at all — don't add
user profiles, settings, or anything auth typically drags in. One login,
one saved JSON blob keyed to the user ID.

### 6. Deploy (Vultr + GoDaddy)

Deployed *before* the app does anything real — ideally tonight. A domain
from GoDaddy pointed at it. This is infrastructure, not a feature; get it
inert-but-working early so it's a non-event on Sunday morning.

## What's explicitly out of scope

- Real form submission to any actual government system
- Multi-form support — one form, done well, beats three done badly
- Multi-turn voice conversation — one utterance in, one summary out
- Any database beyond "one JSON blob per logged-in user"
- Multi-language (mention it as future work in the pitch if it helps the story)

## The stack

Next.js (App Router) + TypeScript + Tailwind. One API route for extraction,
one for the ElevenLabs call. No separate backend service — everything lives
in the Next.js app, deployed as one unit.

## The four things that must survive contact with the judges

1. **Text input always works**, mic or no mic.
2. **The demo has a real URL** (Vultr + GoDaddy), not `localhost`.
3. **The extraction function was tested on typed input before voice was ever
   wired up** — so a voice bug never blocks you from proving the core idea
   works.
4. **One form, fully working**, beats three forms half-working. If Saturday
   afternoon arrives and this is behind schedule, cut a track before cutting
   the core loop.

## Track checklist

- [ ] Gemini — structured extraction from natural speech/text
- [ ] ElevenLabs — spoken readback of the completed form
- [ ] Auth0 — login + save/resume
- [ ] Vultr — deployment target
- [ ] GoDaddy — domain pointed at the Vultr deploy
- [ ] Best UI/UX — one flow, polished, using the `frontend-design` skill

---

*This doc is the plan, not a spec set in stone. If something here turns out
wrong once code exists, say so and we update this file — a doc that's out of
sync with the code is worse than no doc.*
