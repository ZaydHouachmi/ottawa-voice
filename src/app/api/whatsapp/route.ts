import { after } from "next/server";
import { enqueue, handleIncoming, isValidTwilioSignature, sendWhatsApp } from "@/lib/whatsapp";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

// Twilio calls this for every incoming WhatsApp message. It gives a webhook
// ~15s to answer, and extraction alone can take close to 10s, so we answer
// immediately with empty TwiML and send the real reply afterwards through
// Twilio's REST API (after() keeps that work running past the response).
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return new Response("WhatsApp channel not configured", { status: 503 });
  }

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  // Must be the exact public URL configured in Twilio - behind Caddy,
  // req.url is the internal http://127.0.0.1:3000 address, not this.
  const publicUrl = process.env.TWILIO_WEBHOOK_URL ?? "https://speakgov.com/api/whatsapp";
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!isValidTwilioSignature(authToken, publicUrl, params, signature)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = params.From;
  if (from?.startsWith("whatsapp:")) {
    const body = params.Body ?? "";
    const numMedia = Number(params.NumMedia ?? 0) || 0;
    after(() =>
      enqueue(from, async () => {
        try {
          await handleIncoming(from, body, numMedia);
        } catch (err) {
          console.error("WhatsApp handling failed:", err);
          await sendWhatsApp(from, "Sorry, something went wrong. Please try again.").catch(() => {});
        }
      }),
    );
  }

  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}
