// Display-only translations. Deliberately separate from schema.ts's field
// labels, which stay English internally — those feed the Gemini prompt and
// have nothing to do with what a person reads on screen. Mixing the two
// would mean changing the extraction prompt every time someone tweaks UI
// copy, which is its own kind of bug waiting to happen.

export type Lang = "en-US" | "fr-CA";

export const fieldLabels: Record<string, Record<Lang, string>> = {
  fullName: { "en-US": "Full name", "fr-CA": "Nom complet" },
  address: { "en-US": "Address", "fr-CA": "Adresse" },
  phoneNumber: { "en-US": "Phone number", "fr-CA": "Numéro de téléphone" },
  email: { "en-US": "Email address", "fr-CA": "Adresse courriel" },
  dependents: { "en-US": "Number of dependents", "fr-CA": "Personnes à charge" },
  householdSize: { "en-US": "Household size", "fr-CA": "Taille du ménage" },
  annualIncome: { "en-US": "Annual household income", "fr-CA": "Revenu annuel du ménage" },
  activityRequested: { "en-US": "Program requested", "fr-CA": "Programme demandé" },
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
  // Spoken, not just displayed - the point is that hearing this replaces
  // needing to read the field labels below at all. See ARCHITECTURE.md:
  // reading is never required in either direction.
  whatToSay: {
    "en-US": "🔊 Not sure what to say? Tap to hear what I need",
    "fr-CA": "🔊 Vous ne savez pas quoi dire ? Touchez pour écouter",
  },
  whatToSayPrompt: {
    "en-US":
      "Here's what I need. At minimum, tell me your full name, your address, and your yearly household income. You can also mention a phone number or email, how many dependents you have and your household size, and which recreation program you'd like fee assistance for. You can say it all at once, in your own words.",
    "fr-CA":
      "Voici ce dont j'ai besoin. Au minimum, dites-moi votre nom complet, votre adresse, et votre revenu annuel du ménage. Vous pouvez aussi mentionner un numéro de téléphone ou une adresse courriel, le nombre de personnes à votre charge et la taille de votre ménage, ainsi que le programme de loisirs pour lequel vous souhaitez une aide aux frais. Vous pouvez tout dire d'un coup, dans vos propres mots.",
  },
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
  required: { "en-US": "required", "fr-CA": "obligatoire" },
  stillNeeded: { "en-US": "Still needed:", "fr-CA": "Il manque encore :" },
  tapToHearShort: { "en-US": "🔊 tap to hear", "fr-CA": "🔊 touchez pour écouter" },
  stillNeedLead: { "en-US": "Got it. I still need", "fr-CA": "C'est noté. Il me manque encore" },
  your: { "en-US": "your", "fr-CA": "votre" },
  filledIn: { "en-US": "Filled in:", "fr-CA": "Rempli :" },
  doneSubLoggedOut: {
    "en-US": "Not saved to an account. Log in to keep it, or print a copy.",
    "fr-CA": "Non enregistré dans un compte. Connectez-vous pour le garder, ou imprimez une copie.",
  },
  // /any-form - fill in a form someone pasted from anywhere
  tryAnotherForm: { "en-US": "Have a different form? Paste it in", "fr-CA": "Un autre formulaire ? Collez-le ici" },
  backToHandInHand: { "en-US": "Back to the Hand in Hand form", "fr-CA": "Retour au formulaire Hand in Hand" },
  pasteTitle: { "en-US": "Fill in any form by talking", "fr-CA": "Remplissez n'importe quel formulaire en parlant" },
  pasteIntro: {
    "en-US":
      "Copy the questions from any form — a website, a PDF, an email — and paste them below. SpeakGov turns them into a form you can fill in by voice.",
    "fr-CA":
      "Copiez les questions de n'importe quel formulaire — un site Web, un PDF, un courriel — et collez-les ci-dessous. ParlezGouv en fait un formulaire que vous pouvez remplir à voix haute.",
  },
  pastePlaceholder: { "en-US": "Paste the form's questions here…", "fr-CA": "Collez les questions du formulaire ici…" },
  readThisForm: { "en-US": "Read this form", "fr-CA": "Lire ce formulaire" },
  readingForm: { "en-US": "Reading the form…", "fr-CA": "Lecture du formulaire…" },
  parseErrorText: {
    "en-US": "Couldn't find questions to fill in there. Try pasting just the form's fields.",
    "fr-CA": "Aucune question à remplir trouvée. Essayez de coller seulement les champs du formulaire.",
  },
  experimentalNote: {
    "en-US": "Experimental: works best on simple forms. Checkboxes and dates become short answers.",
    "fr-CA": "Expérimental : fonctionne mieux avec des formulaires simples. Cases à cocher et dates deviennent des réponses courtes.",
  },
  formReadCount: { "en-US": "Form read: {n} questions", "fr-CA": "Formulaire lu : {n} questions" },
  useDifferentForm: { "en-US": "Use a different form", "fr-CA": "Utiliser un autre formulaire" },
  customDisclaimer: {
    "en-US": "Built from a form you pasted. Nothing here is submitted anywhere, and pasted forms aren't saved.",
    "fr-CA": "Créé à partir d'un formulaire que vous avez collé. Rien n'est transmis, et les formulaires collés ne sont pas enregistrés.",
  },
  doneSubCustom: {
    "en-US": "Pasted forms aren't saved. Print a copy to keep it.",
    "fr-CA": "Les formulaires collés ne sont pas enregistrés. Imprimez une copie pour la garder.",
  },
  customPromptLead: { "en-US": "Here's what this form asks for.", "fr-CA": "Voici ce que demande ce formulaire." },
  customPromptRequired: { "en-US": "At minimum, tell me", "fr-CA": "Au minimum, dites-moi" },
  customPromptOptional: { "en-US": "You can also mention", "fr-CA": "Vous pouvez aussi mentionner" },
  customPromptAll: { "en-US": "Tell me", "fr-CA": "Dites-moi" },
  customPromptClose: {
    "en-US": "You can say it all at once, in your own words.",
    "fr-CA": "Vous pouvez tout dire d'un coup, dans vos propres mots.",
  },
  printButton: { "en-US": "Print or save as PDF", "fr-CA": "Imprimer ou enregistrer en PDF" },
  printEyebrow: { "en-US": "Application summary", "fr-CA": "Résumé de la demande" },
  printPrepared: { "en-US": "Prepared with SpeakGov on", "fr-CA": "Préparé avec ParlezGouv le" },
  printNotSubmitted: {
    "en-US":
      "A copy for your records or to bring to a service counter. It has not been submitted to the City.",
    "fr-CA":
      "Une copie pour vos dossiers ou à apporter à un comptoir de service. Elle n'a pas été transmise à la Ville.",
  },
  signature: { "en-US": "Signature", "fr-CA": "Signature" },
  dateLabel: { "en-US": "Date", "fr-CA": "Date" },
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
  logInToSave: {
    "en-US": "Log in to save your progress",
    "fr-CA": "Connectez-vous pour enregistrer votre progression",
  },
  signedInAs: { "en-US": "Signed in", "fr-CA": "Connecté" },
  logOut: { "en-US": "Log out", "fr-CA": "Se déconnecter" },
  logIn: { "en-US": "Log in", "fr-CA": "Se connecter" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}

export function fieldLabel(key: string, lang: Lang): string {
  return fieldLabels[key]?.[lang] ?? key;
}
