## Inspiration

Government benefit forms exist to help people, but the forms themselves are often the barrier. Dense language, unfamiliar fields, no help if English or French isn't your first language — the people who most need programs like Ottawa's Hand in Hand recreation and culture fee support are often the people least equipped to fight through the paperwork to get it: someone with low literacy, a newcomer still learning the language, an elderly resident unfamiliar with online forms, or just someone exhausted after a long shift who doesn't have the patience left to parse a government website.

We wanted to try removing the form entirely. Not the program, not the eligibility criteria — just the *interface*. Instead of reading a form and figuring out what to type where, you just talk about your situation the way you'd explain it to a friend, and the structure gets built for you.

## What it does

Open SpeakGov and you get a mic button and a text box — same input, your choice, and voice never blocks the flow if it fails. You describe your situation out loud or by typing:

> "Hi, my name's Zayd Houachmi, I live at 110 Dunbarton Court in Ottawa, I have two dependents, and my annual income is about 50 thousand dollars."

Gemini extracts the four fields for a real program (modeled on the City of Ottawa's Hand in Hand recreation fee support) and they populate live on screen. You review what it heard — correcting a field is one tap — then confirm, and ElevenLabs reads the completed summary back to you in a real voice before you're done. Log in with Auth0 and your progress saves automatically, so a half-filled form is there when you come back.

The whole thing works in English or French, chosen explicitly rather than guessed from your browser — Ottawa is officially bilingual, and a French-speaking user gets a fully French interface, not just a translated label here and there.

## How we built it

Next.js 16 (App Router, Turbopack) deployed on a Vultr VPS behind Caddy, which handles automatic HTTPS via Let's Encrypt for our GoDaddy domain, speakgov.com. Gemini 3.8 Flash does the structured extraction from raw speech/text. ElevenLabs handles the spoken readback. Auth0 gates a simple save/resume feature — one JSON blob per user, nothing more elaborate than the feature actually needs. PM2 keeps the Node process alive and restarts it on crash.

The build itself leaned heavily on Claude Code as a development partner — not just for writing code, but for the actual debugging work described below: reading raw API error payloads, diffing SDK source when documentation didn't match reality, and testing every fix against the live deployment rather than assuming it worked. Every commit in the repo reflects that collaboration honestly.

## Challenges we ran into

**Gemini silently dropping fields.** Our first real extraction test came back with one field, wrong, out of four. Digging into the raw response showed the model was spending hundreds of tokens "thinking" about all four fields internally, then writing only one to the visible output before stopping. The fix was counterintuitive: mark every field as schema-*required* (with nullable types) instead of optional, which forces the model to actually consider each one instead of taking a shortcut. Verified with partial input, full input, and French input before trusting it.

**Free-tier rate limits, twice.** Testing burned through Gemini's 20-requests-a-day free tier not once but twice over the course of the build. The real fix was enabling billing (pennies per call at our volume); the code fix was adding a hard timeout, since a rate-limited request was taking 30+ seconds to fail on its own — long enough to look like a frozen page during a live demo instead of a clean error.

**Speech recognition genuinely struggles with names.** Live testing on an uncommon name ("Zayd Houachmi") produced a transcript where the recognizer misheard it as "Dave," the speaker tried to correct it by spelling it out loud, and because we'd set recognition to `continuous: true` to fix an earlier "cuts me off mid-sentence" bug, every retry got appended into one increasingly garbled blob. The fix wasn't more clever recognition — it was removing an auto-submit-on-stop behavior so the person can see what was actually heard and fix it before it goes anywhere, the same way a typo in the text box always could be.

**Two language bugs from the same root cause.** Both the speech recognizer and the text-to-speech readback were silently inheriting the browser's OS locale instead of respecting the explicit English/French toggle in the UI — so on a French-locale machine, the mic transcribed English speech as French, and separately, the "read it back" voice spoke French even in English mode. Same fix both times: never infer language, always pass the explicit user choice.

**A Turbopack bug, confirmed against the framework's own source and issue tracker.** Auth0's login route worked in every test except the deployed one, returning a 404. Chasing it down led through a confirmed, currently-open Next.js bug where Turbopack silently fails to populate the middleware manifest for the new `proxy.ts` convention specifically — the build claims success and even prints "Proxy (Middleware)" in its own summary, but nothing is actually wired up at runtime. The eventual fix mounts the same Auth0 logic as an explicit Route Handler instead of relying on Next's middleware auto-mounting, sidestepping the bug rather than waiting on it to be patched.

## Accomplishments that we're proud of

A solo build that's fully deployed, on a real domain, with real HTTPS, and every integration genuinely working end to end rather than half-wired: Gemini, ElevenLabs, Auth0, Vultr, and a GoDaddy domain, in one coherent product rather than five bolted-together demos. Every bug listed above was found by testing against the live site with real input, not assumed fixed — including a maple-leaf mascot that took five failed hand-drawn attempts before we pulled the actual geometry from Canada's flag SVG and it worked on the first try.

## What we learned

That the parts of a hackathon project people don't show off — a schema that forces a model to actually try, a rate-limit timeout, a language toggle that's honored everywhere instead of half the app — are usually where the real reliability comes from. And that when documentation and reality disagree, the fastest path is reading the actual source or the actual error, not guessing a second and third time.

## What's next for SpeakGov

Right now SpeakGov handles one form well, on purpose — reliability mattered more than breadth for a weekend build. The natural next step is a front door that listens to someone's situation and routes them to the *right* form among several, which is a classification problem rather than an extraction one. Beyond that: translating extracted answers into an official language when someone speaks a language the form doesn't accept, and — the actual goal — a conversation with the City of Ottawa about whether a real version of this belongs in front of a real program.
