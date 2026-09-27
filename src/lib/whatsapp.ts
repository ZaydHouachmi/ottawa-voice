import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractFields } from "@/lib/extract";
import { fieldLabel, type Lang } from "@/lib/i18n";
import { handInHandForm, type FormField, type FormValues } from "@/lib/schema";

// The WhatsApp channel: same Hand in Hand form, same extraction, same
// "I still need..." follow-up as the website - just over chat, so someone
// can fill it in from any phone without opening a browser.

// ---------- Twilio ----------

// Twilio signs every webhook: HMAC-SHA1 over the exact public URL plus
// every POST param (sorted by name, name+value concatenated), keyed with
// the account's auth token. Without this check anyone could POST here and
// make us burn Gemini/Twilio credit or message arbitrary numbers.
export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = Buffer.from(createHmac("sha1", authToken).update(data, "utf8").digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function sendWhatsApp(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("Twilio is not configured");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body.slice(0, 1500) }),
  });
  if (!res.ok) throw new Error(`Twilio send failed: ${res.status} ${await res.text()}`);
}

// ---------- Conversation state (one small JSON file per phone number) ----------

type ChatState = { lang: Lang; fields: FormValues; confirmed: boolean };

const DATA_DIR = path.join(process.cwd(), "data", "whatsapp");

// File named by a hash of the number, not the number itself.
function fileFor(from: string) {
  return path.join(DATA_DIR, `${createHash("sha256").update(from).digest("hex").slice(0, 32)}.json`);
}

async function loadState(from: string): Promise<ChatState | null> {
  try {
    return JSON.parse(await readFile(fileFor(from), "utf8")) as ChatState;
  } catch {
    return null;
  }
}

async function saveState(from: string, state: ChatState) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileFor(from), JSON.stringify(state, null, 2));
}

// Two quick messages from the same person must be handled in order, or the
// second could read state before the first has saved its answers.
const queues = new Map<string, Promise<void>>();
export function enqueue(from: string, task: () => Promise<void>) {
  const next = (queues.get(from) ?? Promise.resolve()).then(task, task);
  const tracked = next.finally(() => {
    if (queues.get(from) === tracked) queues.delete(from);
  });
  queues.set(from, tracked);
  return next;
}

// ---------- Messages ----------

const M = {
  intro: {
    "en-US":
      "Hi! I'm SpeakGov. I'll help you fill in the *Hand in Hand recreation fee support* form, just by chatting.\n\nTell me about yourself in your own words. I need at least your *full name*, your *address*, and your *yearly household income*. You can also mention your phone, email, dependents, household size, and the program you'd like help paying for.\n\nRéponds *FRANÇAIS* pour continuer en français. Reply *RESTART* anytime to start over.\n\n_A hackathon prototype, not an official City of Ottawa service. Nothing is submitted._",
    "fr-CA":
      "Bonjour! Je suis ParlezGouv. Je vais vous aider à remplir le formulaire *Hand in Hand de soutien aux frais de loisirs*, simplement en discutant.\n\nParlez-moi de vous, dans vos propres mots. J'ai besoin au minimum de votre *nom complet*, de votre *adresse* et de votre *revenu annuel du ménage*. Vous pouvez aussi mentionner votre téléphone, votre courriel, vos personnes à charge, la taille de votre ménage et le programme pour lequel vous voulez de l'aide.\n\nReply *ENGLISH* to continue in English. Répondez *RECOMMENCER* pour tout reprendre.\n\n_Un prototype de hackathon, pas un service officiel de la Ville d'Ottawa. Rien n'est transmis._",
  },
  soFar: { "en-US": "Got it. Here's what I have so far:", "fr-CA": "C'est noté. Voici ce que j'ai pour l'instant :" },
  stillNeed: { "en-US": "I still need", "fr-CA": "Il me manque encore" },
  replyWithThem: {
    "en-US": "Just reply with it in your own words.",
    "fr-CA": "Répondez simplement dans vos propres mots.",
  },
  allRequired: {
    "en-US": "That's everything required. Reply *DONE* to finish, or send any correction.",
    "fr-CA": "Tout ce qui est obligatoire est là. Répondez *TERMINÉ* pour finir, ou envoyez une correction.",
  },
  nothingFound: {
    "en-US":
      "I couldn't find answers for the form in that. Try telling me something like your name, your address, or your yearly income.",
    "fr-CA":
      "Je n'ai pas trouvé de réponses pour le formulaire. Dites-moi par exemple votre nom, votre adresse ou votre revenu annuel.",
  },
  done: {
    "en-US": "Your application is filled in. Here's the full summary:",
    "fr-CA": "Votre demande est remplie. Voici le résumé complet :",
  },
  doneTail: {
    "en-US": "Keep this message for your records, or show it at a service counter. Reply *RESTART* to fill in a new one.",
    "fr-CA": "Gardez ce message pour vos dossiers, ou montrez-le à un comptoir de service. Répondez *RECOMMENCER* pour en remplir un nouveau.",
  },
  voiceNotYet: {
    "en-US": "I can't listen to voice notes yet. Please type your answer for now.",
    "fr-CA": "Je ne peux pas encore écouter les messages vocaux. Veuillez écrire votre réponse pour l'instant.",
  },
  error: {
    "en-US": "Sorry, something went wrong reading that. Please try again in a moment.",
    "fr-CA": "Désolé, une erreur s'est produite. Veuillez réessayer dans un instant.",
  },
  your: { "en-US": "your", "fr-CA": "votre" },
} as const;

const msg = (key: keyof typeof M, lang: Lang) => M[key][lang];

function formatValue(field: FormField, value: string | number) {
  return field.type === "currency" ? `$${Number(value).toLocaleString("en-US")}` : String(value);
}

function summaryLines(fields: FormValues, lang: Lang) {
  return handInHandForm.fields
    .filter((f) => fields[f.key] !== undefined)
    .map((f) => `*${fieldLabel(f.key, lang)}:* ${formatValue(f, fields[f.key])}`)
    .join("\n");
}

function missingRequired(fields: FormValues) {
  return handInHandForm.fields.filter((f) => f.required && fields[f.key] === undefined);
}

function stillNeedLine(missing: FormField[], lang: Lang) {
  const items = missing.map((f) => {
    const label = fieldLabel(f.key, lang);
    return `${msg("your", lang)} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  });
  const list = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(items);
  return `${msg("stillNeed", lang)} ${list}. ${msg("replyWithThem", lang)}`;
}

function progressReply(fields: FormValues, lang: Lang) {
  const missing = missingRequired(fields);
  return `${msg("soFar", lang)}\n\n${summaryLines(fields, lang)}\n\n${
    missing.length ? stillNeedLine(missing, lang) : msg("allRequired", lang)
  }`;
}

// Lowercase, strip accents and punctuation, so "Français!" == "francais".
function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
}

const COMMANDS = {
  restart: ["restart", "reset", "recommencer", "start over"],
  french: ["francais", "french", "fr"],
  english: ["english", "anglais", "en"],
  greet: ["hi", "hello", "hey", "bonjour", "salut", "allo", "help", "aide", "menu", "start"],
  done: ["done", "confirm", "finish", "termine", "terminer", "fini", "confirmer"],
};

// ---------- The conversation ----------

export async function handleIncoming(from: string, body: string, numMedia: number) {
  const existing = await loadState(from);
  const state: ChatState = existing ?? { lang: "en-US", fields: {}, confirmed: false };
  const lang = () => state.lang;
  const reply = (text: string) => sendWhatsApp(from, text);

  const text = body.trim().slice(0, 2000);
  const cmd = normalize(text);

  if (!text && numMedia > 0) {
    await reply(msg("voiceNotYet", lang()));
    return;
  }
  if (COMMANDS.restart.includes(cmd)) {
    await saveState(from, { lang: state.lang, fields: {}, confirmed: false });
    await reply(msg("intro", lang()));
    return;
  }
  if (COMMANDS.french.includes(cmd) || COMMANDS.english.includes(cmd)) {
    state.lang = COMMANDS.french.includes(cmd) ? "fr-CA" : "en-US";
    await saveState(from, state);
    await reply(
      Object.keys(state.fields).length ? progressReply(state.fields, lang()) : msg("intro", lang()),
    );
    return;
  }
  if (!existing || COMMANDS.greet.includes(cmd) || !cmd) {
    await saveState(from, state);
    // A first message that's clearly just a greeting (or the sandbox "join"
    // code) gets the intro; anything with real content falls through and is
    // extracted, so "Hi, I'm Sam, I live at..." works as a first message.
    if (!existing ? text.length < 25 || cmd.startsWith("join ") : true) {
      await reply(msg("intro", lang()));
      return;
    }
  }
  if (COMMANDS.done.includes(cmd)) {
    const missing = missingRequired(state.fields);
    if (missing.length) {
      await reply(stillNeedLine(missing, lang()));
      return;
    }
    state.confirmed = true;
    await saveState(from, state);
    await reply(`${msg("done", lang())}\n\n${summaryLines(state.fields, lang())}\n\n${msg("doneTail", lang())}`);
    return;
  }

  let found: FormValues;
  try {
    found = await extractFields(text, handInHandForm);
  } catch (err) {
    console.error("WhatsApp extraction failed:", err);
    await reply(msg("error", lang()));
    return;
  }
  if (Object.keys(found).length === 0) {
    await reply(msg("nothingFound", lang()));
    return;
  }
  state.fields = { ...state.fields, ...found };
  state.confirmed = false;
  await saveState(from, state);
  await reply(progressReply(state.fields, lang()));
}
