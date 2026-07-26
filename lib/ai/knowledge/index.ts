import type { ChatCategory } from "@/lib/ai/router";
import { taxesKnowledge } from "@/lib/ai/knowledge/taxes";
import { housingKnowledge } from "@/lib/ai/knowledge/housing";
import { immigrationKnowledge } from "@/lib/ai/knowledge/immigration";
import { familyKnowledge } from "@/lib/ai/knowledge/family";
import { employmentKnowledge } from "@/lib/ai/knowledge/employment";
import { socialBenefitsKnowledge } from "@/lib/ai/knowledge/social-benefits";
import { healthKnowledge } from "@/lib/ai/knowledge/health";
import { bankingKnowledge } from "./banking";
import { educationKnowledge } from "./education";
import { publicServicesKnowledge } from "./public-services";
import { mobilityKnowledge } from "./mobility";
import { insuranceKnowledge } from "./insurance";
const generalKnowledge = `
DOMAIN: GENERAL GERMANY LIFE ASSISTANCE

Purpose:
Provide practical orientation for everyday life and bureaucracy in Germany.

General rules:
- Answer the user's main question directly.
- Explain the usual German process in plain language.
- Name the responsible authority or organisation.
- Avoid unsupported certainty.
- Do not invent deadlines, amounts, laws, forms or official links.
- Ask clarification questions only when essential.
- Suggest one useful next action AL can help prepare.
- Use profile, process and document context only when relevant.
- Clearly distinguish general information from conclusions about the user's specific case.
`.trim();

const knowledgeByCategory: Partial<
  Record<ChatCategory, string>
> = {
  tax: taxesKnowledge,
  housing: housingKnowledge,
    immigration: immigrationKnowledge,
    family: familyKnowledge,
    employment: employmentKnowledge,
    social_benefits: socialBenefitsKnowledge,
    health: healthKnowledge,
    banking: bankingKnowledge,
    education: educationKnowledge,
    public_services: publicServicesKnowledge,
    mobility: mobilityKnowledge,
    insurance: insuranceKnowledge,
};

export function getKnowledgeForCategory(
  category: ChatCategory,
): string {
  return knowledgeByCategory[category] || generalKnowledge;
}