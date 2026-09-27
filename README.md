# SpeakGov / ParlezGouv

**Fill in a government benefit form by talking about your situation — in English or French — without needing to read the form.**

Live: **[speakgov.com](https://speakgov.com)** · Built solo at **Hack the Hill III** (uOttawa, September 2026)

---

## The problem

Benefit forms exist to help people, but the form itself is often the barrier. The people who most need a program like the City of Ottawa's Hand in Hand recreation fee support — someone with low literacy, a newcomer still learning the language, an elderly resident, someone with a disability that makes typing hard — are often the least equipped to get through the paperwork.

## What SpeakGov does

SpeakGov is a conversational layer in front of an existing form. It doesn't replace the form, the eligibility rules, or the government's backend. It's one more accessible channel, next to paper, phone, and the service counter.

1. **It tells you what it needs, out loud.** One tap, and a real voice explains what the form asks for in plain language. You don't need to read the field labels first.
2. **You answer however you like.** Speak or type, all at once and in your own words. Voice sits on top of the same text path, so if the mic fails, typing gives the exact same result.
3. **The form fills itself in.** Gemini pulls structured answers out of what you said, and they type themselves into the form live.
4. **It asks for what's missing.** If you left out something required, it says so: *"Got it. I still need your address and your annual household income."* If you were speaking, it says this out loud; if you were typing, it shows it. Answer just that part and it merges in.
5. **It reads everything back before you confirm.** ElevenLabs reads the completed summary aloud. Correcting a field is one tap.
6. **It saves your progress.** Log in with Auth0 and a half-finished form is still there when you come back.

Every step works in English and French. The language is an explicit choice, never guessed from the browser. At no point from start to finish do you need to read text to use it.

### Any form ([speakgov.com/any-form](https://speakgov.com/any-form), experimental)

Paste the questions from any form: a web page, a PDF, an email. Gemini turns them into a field list, marking required fields and turning checkbox and yes/no options into hints. From there it's the same flow: spoken prompt, voice or typed answers, follow-up for what's missing, readback, and print. Someone, say a caseworker or a family member, can paste the form once, and the person applying fills it in by talking. When you're logged in, the pasted form and your answers are saved separately from your Hand in Hand application, so neither can overwrite the other. The server re-validates the parsed form on every request, since it comes from untrusted text.

## Stack

| Piece | Used for |
|---|---|
| **Next.js 16** (App Router, Turbopack), React 19, TypeScript, Tailwind v4 | App and API routes in one project |
| **Gemini API** (`gemini-3.8-flash`, structured JSON output) | Turning free-form speech or text into form fields |
| **ElevenLabs** (`eleven_multilingual_v2`) | Spoken prompt, follow-up, and readback, EN and FR in one voice |
| **Web Speech API** | Speech recognition in the browser |
| **Auth0** | Login plus save/resume (one JSON document per user) |
| **Vultr** + Caddy + PM2 | Hosting, automatic HTTPS, process supervision |
| **GoDaddy Registry** | speakgov.com |

## How it works

```
speech ─┐
        ├─► text box (review / edit) ─► /api/extract (Gemini) ─► form fields
typing ─┘                                                          │
                                   missing required fields? ◄──────┤
                                   └─► spoken follow-up             │
                                         (/api/speak, ElevenLabs)   ▼
                                                        readback ─► confirm
```

- `src/lib/schema.ts` defines the Hand in Hand form (8 fields, 3 required) and validates pasted forms.
- `src/app/api/extract/route.ts` handles Gemini extraction with a strict JSON schema, for the default form or a pasted one.
- `src/app/api/parse-form/route.ts` turns pasted form text into a field list.
- `src/app/api/speak/route.ts` handles ElevenLabs text-to-speech. If it's unavailable, the browser's own speech synthesis takes over.
- `src/app/api/progress/route.ts` handles save/resume, gated by Auth0.
- `src/components/FormExperience.tsx` is the whole interface. It's shared by `/` and `/any-form`.

## Engineering notes

- **Why every schema field is `required`.** With an all-optional JSON schema, the model would reason about every field internally, then write only one of them to its output. Making every field required and nullable forces it to consider each one. The nulls are stripped out before anything reaches the client.
- **Why voice never auto-submits.** Browser speech recognition struggles with uncommon names. Sending a misheard name straight to the model turned one mistake into someone spelling their name out loud over and over. Now the transcript lands in the text box for a quick check first.
- **Why the language is always explicit.** Inheriting the operating system's locale silently switched both speech recognition and read-aloud to French on a French-language machine, even for someone speaking English.
- **Accessibility.** A polite live region narrates what was filled in and what's still missing, errors use `role="alert"`, required fields are marked for screen readers, and every animation respects `prefers-reduced-motion`.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in the keys below
npm run dev                        # http://localhost:3000
```

Keys: `GOOGLE_API_KEY` and `ELEVENLABS_API_KEY` (optional: `ELEVENLABS_VOICE_ID`). For login, add Auth0's standard `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, and `APP_BASE_URL`. Everything except login works without the Auth0 keys.

## Honest scope

The Hand in Hand form is the polished, fully tested flow. It's modeled on the shape of Ottawa's program, not copied from it, and nothing is submitted to the City. The any-form mode is labeled experimental: it works well on simple forms, but multi-page forms and conditional sections ("if yes, answer 4b") aren't handled. Someone who speaks neither English nor French still isn't served, the same as with a paper form today.
