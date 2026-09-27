import { NextResponse } from "next/server";

// Same reasoning as /api/speak: fail fast on a live demo rather than sit
// frozen waiting on a doomed request. STT on a short voice clip is normally
// fast; 20s gives real headroom without letting a hung call block the mic
// button forever.
const TIMEOUT_MS = 20_000;

// Generous for a spoken form answer (this is seconds of speech, not a
// recording studio session) while still ruling out someone uploading
// something absurd.
const MAX_BYTES = 10 * 1024 * 1024;

const MODEL_ID = "scribe_v2";

// The client always sends the app's own SpeechLang ("en-US" / "fr-CA" — see
// FormExperience.tsx's speechLang state). ElevenLabs' language_code wants a
// plain ISO-639-1 code, not a region variant, so it's mapped here rather
// than trusting whatever string arrives.
const LANGUAGE_CODE: Record<string, string> = {
  "en-US": "en",
  "fr-CA": "fr",
};

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured with an ElevenLabs API key" },
      { status: 500 },
    );
  }

  // Cheap early rejection before we spend time parsing a huge multipart
  // body, when the browser gave us a Content-Length up front.
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    return NextResponse.json({ error: "Audio file too large" }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Missing 'audio' field" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio file too large" }, { status: 413 });
  }

  const language = formData.get("language");
  const languageCode =
    typeof language === "string" ? LANGUAGE_CODE[language] : undefined;

  const upstream = new FormData();
  upstream.set("model_id", MODEL_ID);
  // Only pass language_code when we recognize it - an unmapped value would
  // otherwise get forwarded as-is and ElevenLabs would reject the whole
  // request over one bad field.
  if (languageCode) upstream.set("language_code", languageCode);
  upstream.set("file", audio, "speech");

  try {
    // Race against a hard timeout for the same reason as /api/speak and
    // /api/extract: a hung third-party call should fail fast on a live
    // demo, not freeze the mic button.
    const res = await Promise.race([
      fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          // Deliberately no Content-Type here - fetch sets the multipart
          // boundary itself when the body is a FormData instance. Setting
          // it manually strips the boundary and breaks the upload.
        },
        body: upstream,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`ElevenLabs STT request timed out after ${TIMEOUT_MS / 1000}s`)),
          TIMEOUT_MS,
        ),
      ),
    ]);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("ElevenLabs STT error:", res.status, errBody);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("ElevenLabs STT request failed:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
