<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ottawa Voice — Hack the Hill III

Voice-first government form filler. See `ARCHITECTURE.md` for the system
design — read that before touching `src/`.

**Deadline: Sunday 10:00 EDT. Feature freeze at hour 30 of the hackathon.**

## Commands

```
npm run dev      # dev server, localhost:3000
npm run build    # production build — run before deploying, catches type errors
npm run lint     # eslint
```

No test runner configured. Not adding one — out of scope for a 24-hour build.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. One app,
no separate backend. API routes live in `src/app/api/*/route.ts`.

## Architecture (see ARCHITECTURE.md for the full design)

- `src/app/api/extract/route.ts` — Gemini structured extraction. The core
  function: `extractFields(rawText, schema) -> Partial<FormData>`. Build and
  test this against **typed** input before voice enters the picture.
- `src/app/api/speak/route.ts` — ElevenLabs readback. One call, one audio
  clip. No conversational loop.
- `src/lib/schema.ts` — the hardcoded form schema. One form. Do not add more.
- Voice input is a layer over the *same* text path — never a separate code
  path. If it forks, the mic dying at demo time takes the whole feature down
  with it instead of falling back to typing.

## Gotchas specific to this scaffold

- **Next 16 generates route prop types.** Use `LayoutProps<"/">`,
  `PageProps<"/some/route">` etc. (see `src/app/layout.tsx` for the pattern)
  instead of hand-writing `{ params }: { params: { id: string } }`. Run
  `npm run dev` at least once after adding a new route so the types generate.
- Tailwind v4: config lives in CSS (`globals.css`), not a `tailwind.config.js`
  file. Don't go looking for one.
- `npm`, not `pnpm` — this machine doesn't have pnpm installed and installing
  it now costs time we don't have.

## Rules for tonight specifically

- Text input is the source of truth. Voice is additive. Never build a voice
  feature that has no typed-input equivalent.
- No real form submission, no database beyond one JSON blob per logged-in
  user. If you're tempted to add either, you're scope-creeping — stop and
  check ARCHITECTURE.md's "explicitly out of scope" list.
- Deploy early and often. A broken deploy discovered Sunday morning is a
  disaster; discovered Saturday afternoon is a fifteen-minute fix.
