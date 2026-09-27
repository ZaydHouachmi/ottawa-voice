"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { handInHandForm, type FieldType, type FormValues } from "@/lib/schema";
import { Mascot } from "@/components/Mascot";
import { t, fieldLabel } from "@/lib/i18n";

type Status = "idle" | "listening" | "extracting" | "ready" | "confirmed";

function formatFieldValue(type: FieldType, value: string | number) {
  // Locale fixed to en-US so this renders identically regardless of the
  // demo machine's browser/OS locale (default toLocaleString() picked up
  // this sandbox's locale and rendered "$65 000" with a space — found by
  // testing, not assumed).
  return type === "currency" ? `$${Number(value).toLocaleString("en-US")}` : String(value);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// Reveals `text` one character at a time when `active` flips to true (a
// field going "fresh" right after extraction) - the letter-by-letter
// version of "watch it fill in", replacing an instant snap. Purely visual:
// the button that renders this always carries the full final value as its
// own aria-label, so a screen reader never hears the partial states.
function TypedText({ text, active }: { text: string; active: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(() => (active && !prefersReducedMotion ? 0 : text.length));

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      setShown(text.length);
      return;
    }
    setShown(0);
    // Scale total typing time to length, but keep it inside a band that
    // reads as deliberate without ever stalling a long address field.
    const totalMs = Math.min(950, Math.max(350, text.length * 55));
    const perCharMs = totalMs / Math.max(text.length, 1);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) window.clearInterval(id);
    }, perCharMs);
    return () => window.clearInterval(id);
    // Only restart when `active` itself flips (a new extraction), not on
    // every render while it stays true - re-keying on `text` too would
    // restart the animation mid-type if the value below it ever changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      {text.slice(0, shown)}
      {active && !prefersReducedMotion && shown < text.length && (
        <span className="typing-caret" aria-hidden="true" />
      )}
    </>
  );
}

type SpeechLang = "en-US" | "fr-CA";

export default function Home() {
  const [text, setText] = useState("");
  const [fields, setFields] = useState<FormValues>({});
  const [freshKeys, setFreshKeys] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  // Which spoken moment is active, if any - the "what to say" prompt or the
  // "here's what I have" readback - so each button can show its own state
  // without the two stepping on each other.
  const [audioAction, setAudioAction] = useState<"prompt" | "readback" | "followup" | null>(
    null,
  );
  // Bumped after each successful extraction so an effect can react with the
  // freshly merged fields, instead of the extract callback reading stale ones.
  const [extractCount, setExtractCount] = useState(0);
  // If you spoke to it, it speaks back what's missing; if you typed, it only
  // shows it. Auto-playing audio at someone who chose the keyboard would be
  // a surprise, but someone using voice may not be able to read the notice.
  const voiceRoundRef = useRef(false);
  const [audioStatus, setAudioStatus] = useState<"loading" | "playing">("loading");
  // Explicit choice, never inferred from navigator.language — that silently
  // forced French recognition on a French-locale OS even when the person
  // was speaking English. Found by testing, not assumed.
  const [speechLang, setSpeechLang] = useState<SpeechLang>("en-US");
  const { user, isLoading: userLoading } = useUser();
  // Guards the save effect from firing (and overwriting saved progress with
  // {}) before the initial load has actually finished.
  const progressLoadedRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setMicSupported(Boolean(Ctor));
  }, []);

  // Load saved progress once, right after login. Only merges in saved
  // fields the person hasn't already filled in during this session, so
  // logging in mid-conversation never clobbers what they just said.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/progress");
        if (!res.ok) return;
        const data = (await res.json()) as { fields?: FormValues };
        if (!cancelled && data.fields) {
          setFields((prev) => ({ ...data.fields, ...prev }));
        }
      } catch {
        // No saved progress, or a network hiccup - not fatal, they just
        // start with an empty form same as a first-time visit.
      } finally {
        if (!cancelled) progressLoadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-save whenever fields change while logged in. Debounced so typing
  // a field edit doesn't fire a request per keystroke.
  useEffect(() => {
    if (!user || !progressLoadedRef.current) return;
    const timer = window.setTimeout(() => {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      }).catch(() => {
        // Save failures are silent by design - it's a convenience feature,
        // not core to submitting the form, and shouldn't interrupt the flow.
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [fields, user]);

  // The one function both text and voice input call. Never a separate path —
  // see ARCHITECTURE.md. If voice fails at demo time, typing produces an
  // identical result through this same function.
  const extract = useCallback(async (spokenOrTyped: string) => {
    const trimmed = spokenOrTyped.trim();
    if (!trimmed) return;

    setStatus("extracting");
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Extraction failed");
      }
      const newFields: FormValues = data.fields ?? {};
      setFields((prev) => ({ ...prev, ...newFields }));
      setFreshKeys(new Set(Object.keys(newFields)));
      setStatus("ready");
      setExtractCount((c) => c + 1);
      window.setTimeout(() => setFreshKeys(new Set()), 2200);
    } catch (err) {
      console.error(err);
      setError(t("extractErrorText", speechLang));
      setStatus("idle");
    }
  }, [speechLang]);

  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = speechLang;
    // true = keep listening through natural pauses in a sentence until the
    // user stops it themselves. false (the old value) stopped after the
    // first pause, cutting people off mid-sentence — found by testing.
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += chunk;
        } else {
          interim += chunk;
        }
      }
      setText(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setStatus("idle");
      setError(t("micErrorText", speechLang));
    };

    recognition.onend = () => {
      // Deliberately does NOT auto-submit. Found by real use: browser speech
      // recognition genuinely struggles with uncommon names/addresses, and
      // auto-submitting on stop meant a bad guess (e.g. a name heard as
      // something else) went straight to the model with no chance to catch
      // it - which is exactly what turned one mis-hearing into someone
      // spelling their own name out loud repeatedly. Show what was heard,
      // let the person fix it in the box (fast) or just hit Tell it if it's
      // right, same as typed text always has.
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognitionRef.current = recognition;
    voiceRoundRef.current = true;
    setStatus("listening");
    setError(null);
    setText("");
    recognition.start();
  }, [extract, speechLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const handleTextSubmit = () => {
    extract(text);
  };

  const handleFieldEdit = (key: string, value: string) => {
    const field = handInHandForm.fields.find((f) => f.key === key);
    const parsed =
      field?.type === "text" ? value : value === "" ? undefined : Number(value);
    setFields((prev) => {
      const next = { ...prev };
      if (parsed === undefined || Number.isNaN(parsed)) {
        delete next[key];
      } else {
        next[key] = parsed;
      }
      return next;
    });
    setEditingKey(null);
  };

  const readbackSummary = () =>
    handInHandForm.fields
      .filter((f) => fields[f.key] !== undefined)
      .map((f) => `${fieldLabel(f.key, speechLang)}: ${formatFieldValue(f.type, fields[f.key])}`)
      .join(". ");

  const speakBrowserFallback = (phrase: string) => {
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = speechLang;
    window.speechSynthesis.speak(utterance);
  };

  // Shared by both spoken moments in the app: the "what do I need to say"
  // prompt before input, and the "here's what I have" readback after. Two
  // fully spoken directions, so neither ever requires reading a label to
  // use the product - see the conversation that led to adding the prompt
  // side of this, not just the readback side.
  const playText = async (phrase: string, action: "prompt" | "readback" | "followup") => {
    setAudioAction(action);
    setAudioStatus("loading");
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase }),
      });
      if (!res.ok) throw new Error("speak route failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setAudioAction(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setAudioAction(null);
        URL.revokeObjectURL(url);
      };
      setAudioStatus("playing");
      await audio.play();
    } catch {
      // ElevenLabs unavailable for any reason - browser speech synthesis is
      // the fallback, same resilience pattern as text/voice input elsewhere
      // in this app. Spoken output never just silently fails.
      setAudioAction(null);
      speakBrowserFallback(phrase);
    }
  };

  const speakPrompt = () => playText(t("whatToSayPrompt", speechLang), "prompt");

  const filledCount = handInHandForm.fields.filter(
    (f) => fields[f.key] !== undefined,
  ).length;

  const missingRequired = handInHandForm.fields.filter(
    (f) => f.required && fields[f.key] === undefined,
  );

  // "Got it. I still need your address and your annual household income." -
  // closes the same reading gap the "what to say" prompt closes at the start,
  // but at step two: after a partial answer, someone who can't read the form
  // otherwise has no way to know what's left.
  const followUpPhrase = () => {
    const items = missingRequired.map((f) => {
      const label = fieldLabel(f.key, speechLang);
      return `${t("your", speechLang)} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
    });
    const list = new Intl.ListFormat(speechLang, { style: "long", type: "conjunction" }).format(
      items,
    );
    return `${t("stillNeedLead", speechLang)} ${list}.`;
  };

  const speakFollowUp = () => playText(followUpPhrase(), "followup");

  const speakReadback = () => {
    const tail =
      missingRequired.length > 0
        ? followUpPhrase()
        : speechLang === "fr-CA"
          ? "Appuyez sur Confirmer, ou modifiez un champ ci-dessous."
          : "Tap confirm, or change a field below.";
    const lead = speechLang === "fr-CA" ? "Voici ce que j'ai." : "Here's what I have.";
    return playText(`${lead} ${readbackSummary()}. ${tail}`, "readback");
  };

  // Screen-reader-only narration: reading, what got filled, what's still
  // missing (errors use role="alert" separately). The visible status line
  // changes on every keystroke, so it can't be the live region itself
  // without spamming announcements while someone types.
  const announcement =
    status === "extracting"
      ? t("readingThat", speechLang)
      : status === "ready" && extractCount > 0
        ? `${t("filledIn", speechLang)} ${handInHandForm.fields
            .filter((f) => fields[f.key] !== undefined)
            .map((f) => fieldLabel(f.key, speechLang))
            .join(", ")}.` + (missingRequired.length > 0 ? ` ${followUpPhrase()}` : "")
        : "";

  useEffect(() => {
    if (extractCount === 0) return;
    const wasVoice = voiceRoundRef.current;
    voiceRoundRef.current = false;
    if (wasVoice && missingRequired.length > 0) speakFollowUp();
    // Only react to a new extraction, not to every field edit in between.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractCount]);

  return (
    <>
    <div className="min-h-full flex-1 bg-ground text-ink print:hidden">
      {/* identity banner — the format real government sites use to assert
          official status, used here to say the honest opposite */}
      <div className="border-b-2 border-civic-red bg-accent text-ground">
        <div className="mx-auto flex max-w-xl items-start gap-2 px-5 py-2 text-xs">
          <span aria-hidden className="mt-px">ⓘ</span>
          <p>
            A civic technology prototype, built for Hack the Hill III — not an
            official City of Ottawa or Government of Canada service.
            <span className="opacity-70">
              {" "}
              Un prototype de technologie civique — pas un service officiel.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-9 sm:py-11">
        <header className="animate-intro mb-8">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mascot
                className="h-10 w-10 flex-shrink-0"
                listening={status === "listening"}
              />
              <div>
                <p className="text-base font-bold leading-tight tracking-tight">
                  SpeakGov
                  <span className="ml-1.5 font-normal text-faint">/ ParlezGouv</span>
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                  speakgov.com
                </p>
              </div>
            </div>

            {!userLoading &&
              (user ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-faint">
                    {t("signedInAs", speechLang)}
                    {user.name ? ` — ${user.name}` : ""}
                  </span>
                  <a
                    href="/auth/logout"
                    className="rounded-full border border-rule-strong px-2.5 py-1 font-semibold text-muted hover:bg-sunk"
                  >
                    {t("logOut", speechLang)}
                  </a>
                </div>
              ) : (
                <a
                  href="/auth/login"
                  className="flex-shrink-0 rounded-full border border-rule-strong px-2.5 py-1 text-xs font-semibold text-muted hover:bg-sunk"
                  title={t("logInToSave", speechLang)}
                >
                  {t("logIn", speechLang)}
                </a>
              ))}
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("formTitle", speechLang)}
          </h1>
          <p className="max-w-prose text-sm text-muted">{t("tagline", speechLang)}</p>
        </header>

        {/* input row — lighter than the form panel below, which is the
            actual point of the page and gets the stronger framing */}
        <div className="mb-8 border-b border-rule pb-6">
          {/* Spoken both directions: this tells you what to say before you
              say anything, so reading the field labels below is never
              required to use the product - not just the readback after. */}
          <button
            type="button"
            onClick={speakPrompt}
            disabled={audioAction !== null}
            className="mb-4 w-full rounded-lg border border-accent bg-accent-wash px-3 py-2.5 text-left text-sm font-semibold text-accent-ink disabled:opacity-70"
          >
            {audioAction === "prompt"
              ? audioStatus === "loading"
                ? t("generating", speechLang)
                : t("playing", speechLang)
              : t("whatToSay", speechLang)}
          </button>

          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              {t("speakingLanguage", speechLang)}
            </span>
            <div className="flex overflow-hidden rounded-full border border-rule-strong text-xs font-semibold">
              {(["en-US", "fr-CA"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSpeechLang(lang)}
                  disabled={status === "listening"}
                  className={`px-3 py-1 transition-colors disabled:opacity-50 ${
                    speechLang === lang
                      ? "bg-ink text-ground"
                      : "bg-surface text-muted hover:bg-sunk"
                  }`}
                >
                  {lang === "en-US" ? "English" : "Français"}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={status === "listening" ? stopListening : startListening}
              disabled={!micSupported}
              aria-label={
                status === "listening"
                  ? t("stopListeningAria", speechLang)
                  : t("startListeningAria", speechLang)
              }
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                status === "listening"
                  ? "animate-mic-pulse bg-mic text-surface"
                  : "bg-mic-wash text-mic disabled:opacity-40"
              }`}
            >
              <Mascot
                className="h-6 w-6"
                listening={status === "listening"}
                leafColor="currentColor"
                faceColor={status === "listening" ? "var(--color-mic)" : "var(--color-mic-wash)"}
              />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleTextSubmit();
                }
              }}
              placeholder={
                micSupported
                  ? t("placeholderWithMic", speechLang)
                  : t("placeholderNoMic", speechLang)
              }
              rows={3}
              className="flex-1 resize-none rounded-lg border border-rule-strong bg-ground px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-faint">
              {status === "listening" ? (
                t("listening", speechLang)
              ) : status === "extracting" ? (
                <>
                  {t("readingThat", speechLang)}
                  <span className="thinking-dots inline-flex gap-0.5" aria-hidden>
                    <span className="h-1 w-1 rounded-full bg-faint" />
                    <span className="h-1 w-1 rounded-full bg-faint" />
                    <span className="h-1 w-1 rounded-full bg-faint" />
                  </span>
                </>
              ) : text.trim() ? (
                t("reviewHint", speechLang)
              ) : (
                t("keyboardHint", speechLang)
              )}
            </span>
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!text.trim() || status === "extracting"}
              className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-ground disabled:opacity-30"
            >
              {status === "extracting" ? t("reading", speechLang) : t("tellIt", speechLang)}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-mic">
              {error}
            </p>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>

        {/* live form panel — sharp corners and a heavier border, like a
            document box, not a rounded SaaS card. This is the page's actual
            point, so it carries the strongest framing on the page. */}
        <div className="mb-6 overflow-hidden border-2 border-accent">
          <div className="bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ground">
            {t("formTitle", speechLang)}
          </div>
          {handInHandForm.fields.map((field) => {
            const value = fields[field.key];
            const isFresh = freshKeys.has(field.key);
            const isEditing = editingKey === field.key;
            return (
              <div
                key={field.key}
                className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3 text-sm last:border-b-0"
              >
                <span className="flex-shrink-0 text-faint">
                  {fieldLabel(field.key, speechLang)}
                  {field.required && (
                    <>
                      <span aria-hidden className="ml-0.5 text-civic-red">
                        *
                      </span>
                      <span className="sr-only"> ({t("required", speechLang)})</span>
                    </>
                  )}
                </span>
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={value !== undefined ? String(value) : ""}
                    onBlur={(e) => handleFieldEdit(field.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFieldEdit(field.key, e.currentTarget.value);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    className="w-40 rounded border border-accent px-2 py-0.5 text-right text-sm focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingKey(field.key)}
                    aria-label={`${fieldLabel(field.key, speechLang)}: ${
                      value !== undefined
                        ? formatFieldValue(field.type, value)
                        : t("notYetProvided", speechLang)
                    }`}
                    className={`field-value-transition rounded px-1.5 py-0.5 text-right font-semibold ${
                      value === undefined
                        ? "font-normal italic text-faint"
                        : isFresh
                          ? "animate-field-pop bg-fill-wash text-fill"
                          : "text-ink hover:bg-sunk"
                    }`}
                  >
                    {value !== undefined ? (
                      <span aria-hidden="true">
                        <TypedText text={formatFieldValue(field.type, value)} active={isFresh} />
                      </span>
                    ) : (
                      t("notYetProvided", speechLang)
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* confirm / readback */}
        {filledCount > 0 && status !== "confirmed" && (
          <div className="rounded-xl border border-rule bg-surface p-4">
            {missingRequired.length > 0 && (
              <button
                type="button"
                onClick={speakFollowUp}
                disabled={audioAction !== null}
                className="mb-3 w-full rounded-lg border-l-4 border-civic-red bg-civic-red-wash px-3 py-2.5 text-left text-sm disabled:opacity-70"
              >
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.06em] text-civic-red">
                  {audioAction === "followup"
                    ? audioStatus === "loading"
                      ? t("generating", speechLang)
                      : t("playing", speechLang)
                    : t("tapToHearShort", speechLang)}
                </span>
                <span className="font-semibold">{t("stillNeeded", speechLang)}</span>{" "}
                {missingRequired.map((f) => fieldLabel(f.key, speechLang)).join(", ")}
              </button>
            )}
            <button
              type="button"
              onClick={speakReadback}
              disabled={audioAction !== null}
              className="mb-3 w-full rounded-lg border-l-4 border-accent bg-accent-wash px-3 py-2.5 text-left text-sm disabled:opacity-70"
            >
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.06em] text-accent-ink">
                {audioAction === "readback"
                  ? audioStatus === "loading"
                    ? t("generating", speechLang)
                    : t("playing", speechLang)
                  : t("tapToHear", speechLang)}
              </span>
              {readbackSummary()}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("confirmed")}
                disabled={missingRequired.length > 0}
                className="rounded-lg bg-fill px-4 py-2 text-sm font-semibold text-surface disabled:opacity-40"
              >
                {t("confirm", speechLang)}
              </button>
              <span className="self-center text-xs text-faint">
                {t("correctHint", speechLang)}
              </span>
            </div>
          </div>
        )}

        {status === "confirmed" && (
          <div className="animate-done-in rounded-xl border border-rule bg-surface p-6 text-center">
            <Mascot
              className="mx-auto mb-3 h-14 w-14"
              leafColor="var(--color-fill)"
              faceColor="var(--color-ground)"
            />
            <p className="mb-1 font-bold">{t("doneTitle", speechLang)}</p>
            <p className="text-sm text-muted">
              {user ? t("doneSub", speechLang) : t("doneSubLoggedOut", speechLang)}
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 rounded-lg border border-rule-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-sunk"
            >
              {t("printButton", speechLang)}
            </button>
          </div>
        )}

        <p className="mt-10 max-w-prose text-xs text-faint">
          {t("modeledOn", speechLang)}
        </p>
      </div>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs">
          <span className="font-mono uppercase tracking-[0.08em] text-faint">
            Built at Hack the Hill III
          </span>
          <div className="flex items-center gap-4 font-semibold text-muted">
            <a
              href="https://github.com/ZaydHouachmi/ottawa-voice"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>

    {/* Print-only application sheet. Only exists after confirming (never
        server-rendered, so the date can't cause a hydration mismatch), and
        hard-codes black on white so printing from dark mode still works. */}
    {status === "confirmed" && (
      <section className="hidden bg-white p-2 text-black print:block">
        <p className="text-xs font-bold uppercase tracking-[0.08em]">
          SpeakGov / ParlezGouv — {t("printEyebrow", speechLang)}
        </p>
        <h1 className="mt-1 mb-2 text-2xl font-bold">{t("formTitle", speechLang)}</h1>
        <p className="mb-6 text-sm">
          {t("printPrepared", speechLang)}{" "}
          {new Date().toLocaleDateString(speechLang, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . {t("printNotSubmitted", speechLang)}
        </p>
        <table className="mb-10 w-full border-collapse text-sm">
          <tbody>
            {handInHandForm.fields.map((field) => {
              const value = fields[field.key];
              return (
                <tr key={field.key} className="border-b border-black/30">
                  <th className="w-1/2 py-2.5 pr-4 text-left font-normal">
                    {fieldLabel(field.key, speechLang)}
                    {field.required ? " *" : ""}
                  </th>
                  <td className="py-2.5 font-semibold">
                    {value !== undefined ? formatFieldValue(field.type, value) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mb-10 flex gap-10 text-sm">
          <div className="flex-1 border-t border-black pt-1">{t("signature", speechLang)}</div>
          <div className="w-1/3 border-t border-black pt-1">{t("dateLabel", speechLang)}</div>
        </div>
        <p className="text-xs">{t("modeledOn", speechLang)}</p>
      </section>
    )}
    </>
  );
}
