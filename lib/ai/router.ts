export type ChatCategory =
  | "immigration"
  | "family"
  | "social_benefits"
  | "tax"
  | "housing"
  | "health"
  | "employment"
  | "education"
  | "insurance"
  | "banking"
  | "mobility"
  | "public_services"
  | "general";

const categoryKeywords: Record<
  Exclude<ChatCategory, "general">,
  string[]
> = {
  immigration: [
    "aufenthalt",
    "aufenthaltstitel",
    "einbürgerung",
    "niederlassung",
    "visum",
    "vize",
    "oturum",
    "vatandaşlık",
    "ausländerbehörde",
    "blue card",
    "duldung",
    "fiktionsbescheinigung",
    "familiennachzug"
  ],

  family: [
    "kindergeld",
    "kinderzuschlag",
    "elterngeld",
    "elternzeit",
    "kita",
    "kindergarten",
    "çocuk",
    "aile",
    "unterhalt",
    "sorgerecht"
  ],

  social_benefits: [
    "wohngeld",
    "bürgergeld",
    "arbeitslosengeld",
    "sozialhilfe",
    "pflegegeld",
    "bafög",
    "yardım"
  ],

  tax: [
    "steuer",
    "steuererklärung",
    "finanzamt",
    "elster",
    "werbungskosten",
    "pendlerpauschale",
    "vergi",
    "steuerklasse"
  ],

  housing: [
    "miete",
    "mieter",
    "vermieter",
    "kaution",
    "nebenkosten",
    "mieterhöhung",
    "mietminderung",
    "schimmel",
    "kira",
    "depozito"
  ],

  health: [
  "krankenkasse",
  "gesundheit",
  "arzt",
  "hausarzt",
  "facharzt",
  "krankenhaus",
  "notaufnahme",
  "116117",
  "112",
  "arbeitsunfähigkeit",
  "krankmeldung",
  "krankengeld",
  "pflegegrad",
  "pflegekasse",
  "reha",
  "heil- und kostenplan",
  "zahnersatz",
  "implantat",
  "psychotherapie",
  "psychiater",
  "medikament",
  "rezept",
  "krankschreibung",
  "schwerbehinderung",
  "gesundheitsamt",
  "sağlık",
  "doktor",
  "hastane",
  "diş",
  "psikolog",
  "psikiyatri"
],

  employment: [
    "arbeitsvertrag",
    "kündigung",
    "probezeit",
    "urlaub",
    "arbeitszeugnis",
    "minijob",
    "teilzeit",
    "iş",
    "maaş"
  ],

  education: [
    "schule",
    "studium",
    "universität",
    "anerkennung",
    "ausbildung",
    "diplom",
    "denklik",
    "okul"
  ],

  insurance: [
    "versicherung",
    "haftpflicht",
    "hausrat",
    "rechtsschutz",
    "zahnzusatz",
    "sigorta"
  ],

  banking: [
    "bank",
    "bankkonto",
    "schufa",
    "kredit",
    "darlehen",
    "dispo",
    "pfändung",
    "kredi"
  ],

  mobility: [
    "führerschein",
    "tüv",
    "zulassung",
    "kfz",
    "ehliyet",
    "araç"
  ],

  public_services: [
    "bürgeramt",
    "rathaus",
    "jobcenter",
    "familienkasse",
    "jugendamt",
    "agentur für arbeit",
    "anmeldung",
    "ummeldung"
  ]
};

export function detectChatCategory(
  message: string,
): ChatCategory {

  const normalized =
    message.toLocaleLowerCase("de-DE");

  let bestCategory: ChatCategory = "general";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords) as Array<
    [Exclude<ChatCategory, "general">, string[]]
  >) {

    const score = keywords.reduce(
      (total, keyword) =>
        normalized.includes(keyword.toLocaleLowerCase("de-DE"))
          ? total + 1
          : total,
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}