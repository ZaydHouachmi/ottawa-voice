# SpeakGov — live demo script

Target: **3:00**. Times are cumulative, not per-section — if you're behind at a
checkpoint, cut from the middle (the field-by-field narration), never from
the opening line or the close. Rehearse out loud, not silently — silent
read-throughs always run short of how long it actually takes to say.

Have the site open and logged out, form empty, before you start. Have a
second tab or your phone ready with a recorded backup run in case wifi or
the mic fails live — see the note at the end.

---

### 0:00 — Open cold, no slide, no "hi we're team X"

> "I'm not going to read you a form. I'm going to let it talk to me."

*(Turn the screen to face the judges. Say nothing else for a beat — let that
line sit.)*

### 0:10 — Name the real problem, fast

> "Government benefit forms exist to help people. But the people who need
> them most — someone with low literacy, a newcomer still learning the
> language, an elderly resident, someone exhausted after a double shift —
> are often the people least equipped to fight through the paperwork to get
> them. This is SpeakGov."

### 0:25 — The ask-direction prompt (this is the moment most teams don't have)

*(Tap the "🔊 Not sure what to say?" button.)*

> "Before I say anything, it tells me what it needs — out loud."

*(Let the audio play in full. Don't talk over it — the silence while a real
voice speaks is doing work for you.)*

### 0:45 — Speak the answer (deliberately leave out your income)

*(Tap the mic — the leaf's mouth opens while it listens. Speak clearly, at a
normal pace, and on purpose DON'T mention income:)*

> "Hi, my name's Zayd Houachmi, I live at 110 Dunbarton Court in Ottawa,
> and I have two kids."

*(Tap the mic again to stop. If anything came out wrong — it might, on the
name — say so out loud instead of hiding it:)*

> "And if it mishears something — like an uncommon name — I just fix it
> right here, the same way a typo always could be."

*(Fix it live if needed, then tap Tell it. Let the fields type themselves in.)*

### 1:05 — It asks for what you left out (the moment to let breathe)

*(Don't talk. It says out loud: "Got it. I still need your annual household
income." Let it finish, then answer it — mic again:)*

> "About 50 thousand a year."

*(Tell it. Income types in, the red "Still needed" bar disappears, Confirm
unlocks. Then:)*

> "I never read the form to find out what was missing. It noticed, and it
> asked me."

*(If you typed instead of speaking, it won't auto-play — tap the red
"Still needed" bar to make it speak.)*

### 1:25 — The confirm-direction readback

*(Tap the readback bubble.)*

> "And it reads the whole thing back before I confirm — so neither asking
> nor confirming ever requires me to read text. That's not a small detail.
> A product that only reads your answer back to you still assumed you could
> read the question."

### 1:45 — Bilingual, in ten seconds

*(Tap the "Français" toggle.)*

> "Ottawa's officially bilingual, so this isn't translated labels bolted on
> — the whole interface, the voice, the prompt, all switch. Same for anyone
> speaking French instead of English."

*(Tap back to English — don't demo the whole flow again, just show the
switch happened.)*

### 2:00 — Auth0 + the deploy, quickly, don't over-explain

> "Confirm, and you can print it or save it as a PDF to bring to a counter.
> Log in and your progress saves automatically — a half-filled form is
> there when you come back. And this isn't running on my laptop — it's
> deployed live, real HTTPS, on its own domain: speakgov.com."

### 2:20 — The honest scope line (say this before a judge has to ask)

> "To be clear about what this is: one form, done reliably, on purpose.
> We're not claiming to have solved every barrier — someone who speaks
> neither English nor French still isn't served here, same as a paper form
> today. But for the barrier we did target, both directions are covered."

### 2:40 — The close — this is the sentence you want repeated

> "We're not proposing a government replace their forms or their systems
> with this. We're proposing the pattern: the same form, the same legal
> process, the same backend, with a conversational layer in front of it —
> one more accessible channel a government could *accommodate*, alongside
> the paper form, the phone line, and the counter they already have.
> That's SpeakGov."

*(Stop talking. Let the last line be the last thing they hear — don't trail
into "any questions" or fill the silence.)*

---

## If something breaks live

- **Mic fails or mishears badly:** you already built the fallback into the
  script above (0:45) — say the correction line, type it, keep going. Never
  apologize more than once.
- **ElevenLabs or the API is slow:** the app has a 12–20s timeout and falls
  back to the browser's own voice automatically. If it's visibly stalling
  past ~5s, just narrate over it: "while that loads —" and keep talking
  about the next point, then let it catch up.
- **Wifi dies entirely:** cut to the recorded backup video. Don't
  apologize — say "here's a run from earlier" and keep the same script,
  same pacing, played instead of live.
- **A judge asks about a track you didn't demo out loud** (Auth0 detail,
  GoDaddy, Vultr specifics): all covered briefly in the 2:00 line — if
  they want more, that's a Q&A answer, not something to cram into the
  timed script.

## Before you present, out loud, at least twice

Read the whole thing above at talking pace with a timer running. If you're
over 3:00, the cut order is: bilingual demo (1:45) first, then shorten the
honest-scope line (2:20) to one sentence. Never cut the open or the close —
those are the two lines a judge actually remembers.
