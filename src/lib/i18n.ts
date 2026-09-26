// Display-only translations. Deliberately separate from schema.ts's field
// labels, which stay English internally — those feed the Gemini prompt and
// have nothing to do with what a person reads on screen. Mixing the two
// would mean changing the extraction prompt every time someone tweaks UI
// copy, which is its own kind of bug waiting to happen.

export type Lang = "en-US" | "fr-CA";

export const fieldLabels: Record<string, Record<Lang, string>> = {
  fullName: { "en-US": "Full name", "fr-CA": "Nom complet" },
  address: { "en-US": "Address", "fr-CA": "Adresse" },
  dependents: { "en-US": "Number of dependents", "fr-CA": "Personnes à charge" },
  annualIncome: { "en-US": "Annual household income", "fr-CA": "Revenu annuel du ménage" },
};

const strings = {
  // "Hand in Hand" kept untranslated as the program's proper name; only the
  // descriptive part switches.
  formTitle: {
    "en-US": "Hand in Hand — Recreation Fee Support",
    "fr-CA": "Hand in Hand — Soutien aux frais de loisirs",
  },
  tagline: {
    "en-US": "Tell me about your situation — out loud or typed — and I'll fill this in for you.",
    "fr-CA": "Parlez-moi de votre situation — à voix haute ou par écrit — et je remplirai ceci pour vous.",
  },
  speakingLanguage: { "en-US": "Speaking language", "fr-CA": "Langue parlée" },
  placeholderWithMic: {
    "en-US": "Tell me about your situation, or tap the mic…",
    "fr-CA": "Parlez-moi de votre situation, ou touchez le micro…",
  },
  placeholderNoMic: {
    "en-US":
      "Tell me about your situation — voice input isn't supported in this browser, typing works the same.",
    "fr-CA":
      "Parlez-moi de votre situation — la saisie vocale n'est pas prise en charge par ce navigateur, le clavier fonctionne aussi bien.",
  },
  listening: { "en-US": "Listening — tap the mic when you're done", "fr-CA": "Écoute en cours — touchez le micro une fois terminé" },
  readingThat: { "en-US": "Reading that…", "fr-CA": "Lecture en cours…" },
  reviewHint: {
    "en-US": "Check what I heard above, fix anything wrong, then tap Tell it",
    "fr-CA": "Vérifiez ce que j'ai entendu ci-dessus, corrigez au besoin, puis appuyez sur Envoyer",
  },
  keyboardHint: { "en-US": "⌘/Ctrl + Enter to submit", "fr-CA": "⌘/Ctrl + Entrée pour envoyer" },
  tellIt: { "en-US": "Tell it", "fr-CA": "Envoyer" },
  reading: { "en-US": "Reading…", "fr-CA": "Lecture…" },
  micErrorText: {
    "en-US": "Didn't catch that — you can type instead.",
    "fr-CA": "Je n'ai pas bien entendu — vous pouvez taper à la place.",
  },
  extractErrorText: {
    "en-US":
      "Something went wrong understanding that. You can also fill in a field directly below.",
    "fr-CA":
      "Une erreur s'est produite. Vous pouvez aussi remplir un champ directement ci-dessous.",
  },
  notYetProvided: { "en-US": "not yet provided", "fr-CA": "pas encore fourni" },
  tapToHear: { "en-US": "🔊 tap to hear it read back", "fr-CA": "🔊 touchez pour l'entendre" },
  generating: { "en-US": "🔊 generating…", "fr-CA": "🔊 génération…" },
  playing: { "en-US": "🔊 playing…", "fr-CA": "🔊 lecture…" },
  confirm: { "en-US": "Confirm", "fr-CA": "Confirmer" },
  correctHint: {
    "en-US": "or tap any field above to correct it",
    "fr-CA": "ou touchez un champ ci-dessus pour le corriger",
  },
  doneTitle: { "en-US": "Your application is filled in", "fr-CA": "Votre demande est remplie" },
  doneSub: {
    "en-US": "Saved to your account · log back in anytime to finish or edit",
    "fr-CA": "Enregistré dans votre compte · reconnectez-vous à tout moment pour terminer ou modifier",
  },
  modeledOn: {
    "en-US":
      "Modeled on the shape of the City of Ottawa's Hand in Hand recreation and culture fee support program. Not a copy of the official form, and nothing here is submitted to the City.",
    "fr-CA":
      "Inspiré du programme Entraide d'Ottawa de soutien aux frais de loisirs et de culture. Ce n'est pas une copie du formulaire officiel, et rien ici n'est transmis à la Ville.",
  },
  startListeningAria: { "en-US": "Start speaking", "fr-CA": "Commencer à parler" },
  stopListeningAria: { "en-US": "Stop listening", "fr-CA": "Arrêter l'écoute" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}

export function fieldLabel(key: string, lang: Lang): string {
  return fieldLabels[key]?.[lang] ?? key;
}
