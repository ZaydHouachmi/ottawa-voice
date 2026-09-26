import { NextResponse } from "next/server";

// A calm, clear default voice from ElevenLabs' own docs examples. Fine as
// a placeholder - swap for a voice you actually like from the ElevenLabs
// voice library once you've listened to a few.
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured with an ElevenLabs API key" },
      { status: 500 },
    );
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  try {
    // Race against a timeout for the same reason as /api/extract: a hung
    // third-party call should fail fast on a live demo, not freeze the page.
    const res = await Promise.race([
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // handles English + French natively
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ElevenLabs request timed out after 15s")), 15_000),
      ),
    ]);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("ElevenLabs error:", res.status, errBody);
      return NextResponse.json({ error: "Speech generation failed" }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ElevenLabs request failed:", err);
    return NextResponse.json({ error: "Speech generation failed" }, { status: 502 });
  }
}
