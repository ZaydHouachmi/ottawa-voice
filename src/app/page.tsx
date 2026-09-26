"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { handInHandForm, type FieldType, type FormValues } from "@/lib/schema";
import { Mascot } from "@/components/Mascot";

type Status = "idle" | "listening" | "extracting" | "ready" | "confirmed";

function formatFieldValue(type: FieldType, value: string | number) {
  // Locale fixed to en-US so this renders identically regardless of the
  // demo machine's browser/OS locale (default toLocaleString() picked up
  // this sandbox's locale and rendered "$65 000" with a space — found by
  // testing, not assumed).
  return type === "currency" ? `$${Number(value).toLocaleString("en-US")}` : String(value);
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
  // Explicit choice, never inferred from navigator.language — that silently
  // forced French recognition on a French-locale OS even when the person
  // was speaking English. Found by testing, not assumed.
  const [speechLang, setSpeechLang] = useState<SpeechLang>("en-US");

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setMicSupported(Boolean(Ctor));
  }, []);

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
      window.setTimeout(() => setFreshKeys(new Set()), 2200);
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong understanding that. You can also fill in a field directly below.",
      );
      setStatus("idle");
    }
  }, []);

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
      setError("Didn't catch that — you can type instead.");
    };

    recognition.onend = () => {
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
      if (finalTranscript.trim()) {
        extract(finalTranscript);
      }
    };

    recognitionRef.current = recognition;
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
      .map((f) => `${f.label}: ${formatFieldValue(f.type, fields[f.key])}`)
      .join(". ");

  const speakReadback = () => {
    const utterance = new SpeechSynthesisUtterance(
      `Here's what I have. ${readbackSummary()}. Say confirm, or change a field below.`,
    );
    window.speechSynthesis.speak(utterance);
  };

  const filledCount = handInHandForm.fields.filter(
    (f) => fields[f.key] !== undefined,
  ).length;

  return (
    <div className="min-h-full flex-1 bg-ground text-ink">
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
        <header className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Mascot className="h-10 w-10 flex-shrink-0" />
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
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {handInHandForm.title}
          </h1>
          <p className="max-w-prose text-sm text-muted">
            Tell me about your situation — out loud or typed — and I&apos;ll fill
            this in for you.
          </p>
        </header>

        {/* input row — lighter than the form panel below, which is the
            actual point of the page and gets the stronger framing */}
        <div className="mb-8 border-b border-rule pb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              Speaking language
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
              aria-label={status === "listening" ? "Stop listening" : "Start speaking"}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg transition-colors ${
                status === "listening"
                  ? "bg-mic text-surface"
                  : "bg-mic-wash text-mic disabled:opacity-40"
              }`}
            >
              🎙
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
                  ? "Tell me about your situation, or tap the mic…"
                  : "Tell me about your situation — voice input isn't supported in this browser, typing works the same."
              }
              rows={3}
              className="flex-1 resize-none rounded-lg border border-rule-strong bg-ground px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-faint">
              {status === "listening"
                ? "Listening…"
                : status === "extracting"
                  ? "Reading that…"
                  : "⌘/Ctrl + Enter to submit"}
            </span>
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!text.trim() || status === "extracting"}
              className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-ground disabled:opacity-30"
            >
              {status === "extracting" ? "Reading…" : "Tell it"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-mic">{error}</p>}
        </div>

        {/* live form panel — sharp corners and a heavier border, like a
            document box, not a rounded SaaS card. This is the page's actual
            point, so it carries the strongest framing on the page. */}
        <div className="mb-6 overflow-hidden border-2 border-accent">
          <div className="bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ground">
            {handInHandForm.title}
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
                <span className="flex-shrink-0 text-faint">{field.label}</span>
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
                    className={`rounded px-1.5 py-0.5 text-right font-semibold transition-colors ${
                      value === undefined
                        ? "font-normal italic text-faint"
                        : isFresh
                          ? "bg-fill-wash text-fill"
                          : "text-ink hover:bg-sunk"
                    }`}
                  >
                    {value !== undefined
                      ? formatFieldValue(field.type, value)
                      : "not yet provided"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* confirm / readback */}
        {filledCount > 0 && status !== "confirmed" && (
          <div className="rounded-xl border border-rule bg-surface p-4">
            <button
              type="button"
              onClick={speakReadback}
              className="mb-3 w-full rounded-lg border-l-4 border-accent bg-accent-wash px-3 py-2.5 text-left text-sm"
            >
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.06em] text-accent-ink">
                🔊 tap to hear it read back
              </span>
              {readbackSummary()}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("confirmed")}
                className="rounded-lg bg-fill px-4 py-2 text-sm font-semibold text-surface"
              >
                Confirm
              </button>
              <span className="self-center text-xs text-faint">
                or tap any field above to correct it
              </span>
            </div>
          </div>
        )}

        {status === "confirmed" && (
          <div className="rounded-xl border border-rule bg-surface p-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-fill-wash text-lg text-fill">
              ✓
            </div>
            <p className="mb-1 font-bold">Your application is filled in</p>
            <p className="text-sm text-muted">
              Saved to your account · log back in anytime to finish or edit
            </p>
          </div>
        )}

        <p className="mt-10 max-w-prose text-xs text-faint">
          {handInHandForm.modeledOn}
        </p>
      </div>
    </div>
  );
}
