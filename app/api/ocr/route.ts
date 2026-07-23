import {
  NextRequest,
  NextResponse,
} from "next/server";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;
const MAX_RETRIES = 3;

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type OcrRequestBody = {
  processId?: unknown;
  documentKey?: unknown;
  documentTitle?: unknown;
  fileName?: unknown;
  fileUrl?: unknown;
  contentType?: unknown;
  language?: unknown;
};

type Language =
  | "tr"
  | "de"
  | "en"
  | "ru"
  | "ar"
  | "fa";

type GeminiField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
};

type IntelligenceItem = {
  code: string;
  severity:
    | "info"
    | "warning"
    | "critical";
  message: string;
};

type GeminiOcrResult = {
  rawText: string;
  documentType: string;
  fields: GeminiField[];
  documentMatch:
    | "match"
    | "possible_match"
    | "mismatch"
    | "unknown";
  qualityScore: number;
  isReadable: boolean;
  mrzDetected: boolean;
  expiryStatus:
    | "valid"
    | "expiring_soon"
    | "expired"
    | "not_applicable"
    | "unknown";
  summary: string;
  nextAction: string;
  warnings: IntelligenceItem[];
  risks: IntelligenceItem[];
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const supportedLanguages: Language[] = [
  "tr",
  "de",
  "en",
  "ru",
  "ar",
  "fa",
];

const languageNames: Record<
  Language,
  string
> = {
  tr: "Türkçe",
  de: "Deutsch",
  en: "English",
  ru: "Русский",
  ar: "العربية",
  fa: "فارسی",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY tanımlı değil. .env.local dosyasını kontrol et.",
        },
        { status: 500 },
      );
    }

    const body =
      (await request.json()) as OcrRequestBody;

    const processId =
      readOptionalString(body.processId) ||
      "unknown-process";
    const documentKey =
      readOptionalString(body.documentKey) ||
      "unknown-document";
    const documentTitle =
      readOptionalString(
        body.documentTitle,
      ) || "Belge";
    const fileUrl = readRequiredString(
      body.fileUrl,
      "fileUrl",
    );
    const fileName =
      readOptionalString(body.fileName);
    const requestedContentType =
      readOptionalString(body.contentType);
    const language =
      normalizeLanguage(body.language);

    const parsedFileUrl =
      validateFileUrl(fileUrl);

    const fileResponse = await fetch(
      parsedFileUrl,
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
      },
    );

    if (!fileResponse.ok) {
      return NextResponse.json(
        {
          error: `Belge indirilemedi. HTTP ${fileResponse.status}`,
        },
        { status: 400 },
      );
    }

    const responseContentType =
      normalizeContentType(
        fileResponse.headers.get(
          "content-type",
        ),
      );

    const contentType =
      normalizeContentType(
        requestedContentType,
      ) ||
      responseContentType ||
      inferContentTypeFromFileName(
        fileName,
      ) ||
      inferContentTypeFromUrl(
        parsedFileUrl,
      );

    if (
      !contentType ||
      !ALLOWED_CONTENT_TYPES.has(
        contentType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "OCR yalnızca PDF, JPG, PNG veya WEBP belgelerini destekliyor.",
        },
        { status: 415 },
      );
    }

    const contentLength = Number(
      fileResponse.headers.get(
        "content-length",
      ) || "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Belge 10 MB sınırını aşıyor.",
        },
        { status: 413 },
      );
    }

    const fileBuffer = Buffer.from(
      await fileResponse.arrayBuffer(),
    );

    if (fileBuffer.byteLength === 0) {
      return NextResponse.json(
        {
          error:
            "Belge boş görünüyor.",
        },
        { status: 400 },
      );
    }

    if (
      fileBuffer.byteLength >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Belge 10 MB sınırını aşıyor.",
        },
        { status: 413 },
      );
    }

    const base64File =
      fileBuffer.toString("base64");

    const model =
      process.env.GEMINI_MODEL?.trim() ||
      "gemini-3.5-flash";

    const geminiPayload =
      await callGeminiWithRetry({
        apiKey,
        model,
        contentType,
        base64File,
        prompt: buildOcrPrompt({
          documentTitle,
          fileName,
          language,
        }),
      });

    const responseText =
      geminiPayload.candidates?.[0]
        ?.content?.parts
        ?.map(
          (part) => part.text || "",
        )
        .join("")
        .trim() || "";

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "OCR sağlayıcısı boş sonuç döndürdü.",
        },
        { status: 502 },
      );
    }

    const parsedResult =
      parseGeminiResult(responseText);

    return NextResponse.json({
      success: true,
      data: {
        processId,
        documentKey,
        documentTitle,
        fileName,
        fileUrl,
        contentType,
        documentType:
          parsedResult.documentType,
        rawText: parsedResult.rawText,
        fields: parsedResult.fields,
        intelligence: {
          documentType:
            parsedResult.documentType,
          documentMatch:
            parsedResult.documentMatch,
          qualityScore:
            parsedResult.qualityScore,
          isReadable:
            parsedResult.isReadable,
          mrzDetected:
            parsedResult.mrzDetected,
          expiryStatus:
            parsedResult.expiryStatus,
          summary:
            parsedResult.summary,
          nextAction:
            parsedResult.nextAction,
          warnings:
            parsedResult.warnings,
          risks: parsedResult.risks,
        },
        analyzedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "OCR API hatası:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "OCR işlemi sırasında bilinmeyen bir hata oluştu.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

async function callGeminiWithRetry(input: {
  apiKey: string;
  model: string;
  contentType: string;
  base64File: string;
  prompt: string;
}): Promise<GeminiGenerateContentResponse> {
  let lastError = "";

  for (
    let attempt = 0;
    attempt < MAX_RETRIES;
    attempt += 1
  ) {
    if (attempt > 0) {
      await sleep(
        attempt === 1 ? 900 : 1800,
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        input.model,
      )}:generateContent?key=${encodeURIComponent(
        input.apiKey,
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "You are ALQEV Document Intelligence. Return only valid JSON that follows the provided schema. Never include markdown, analysis, hidden reasoning or explanatory text outside JSON.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType:
                      input.contentType,
                    data: input.base64File,
                  },
                },
                {
                  text: input.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType:
              "application/json",
            maxOutputTokens: 3000,
            responseSchema:
              buildResponseSchema(),
          },
        }),
      },
    );

    const payload =
      (await response.json()) as GeminiGenerateContentResponse;

    if (response.ok) {
      return payload;
    }

    lastError =
      payload.error?.message ||
      `Gemini OCR HTTP ${response.status}`;

    const retryable =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;

    if (
      !retryable ||
      attempt === MAX_RETRIES - 1
    ) {
      throw new Error(lastError);
    }

    console.warn(
      `Gemini OCR geçici hata verdi. Yeniden deneniyor (${
        attempt + 1
      }/${MAX_RETRIES - 1}):`,
      lastError,
    );
  }

  throw new Error(
    lastError ||
      "OCR sağlayıcısına ulaşılamadı.",
  );
}

function buildResponseSchema() {
  const issueSchema = {
    type: "OBJECT",
    properties: {
      code: { type: "STRING" },
      severity: {
        type: "STRING",
        enum: [
          "info",
          "warning",
          "critical",
        ],
      },
      message: { type: "STRING" },
    },
    required: [
      "code",
      "severity",
      "message",
    ],
  };

  return {
    type: "OBJECT",
    properties: {
      rawText: {
        type: "STRING",
      },
      documentType: {
        type: "STRING",
      },
      documentMatch: {
        type: "STRING",
        enum: [
          "match",
          "possible_match",
          "mismatch",
          "unknown",
        ],
      },
      qualityScore: {
        type: "NUMBER",
        minimum: 0,
        maximum: 100,
      },
      isReadable: {
        type: "BOOLEAN",
      },
      mrzDetected: {
        type: "BOOLEAN",
      },
      expiryStatus: {
        type: "STRING",
        enum: [
          "valid",
          "expiring_soon",
          "expired",
          "not_applicable",
          "unknown",
        ],
      },
      summary: {
        type: "STRING",
      },
      nextAction: {
        type: "STRING",
      },
      warnings: {
        type: "ARRAY",
        items: issueSchema,
      },
      risks: {
        type: "ARRAY",
        items: issueSchema,
      },
      fields: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            key: { type: "STRING" },
            label: { type: "STRING" },
            value: { type: "STRING" },
            confidence: {
              type: "NUMBER",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "key",
            "label",
            "value",
            "confidence",
          ],
        },
      },
    },
    required: [
      "rawText",
      "documentType",
      "documentMatch",
      "qualityScore",
      "isReadable",
      "mrzDetected",
      "expiryStatus",
      "summary",
      "nextAction",
      "warnings",
      "risks",
      "fields",
    ],
  };
}

function buildOcrPrompt(input: {
  documentTitle: string;
  fileName?: string;
  language: Language;
}): string {
  return `
Expected document: ${input.documentTitle}
File name: ${input.fileName || "Not specified"}
Output language: ${languageNames[input.language]}

Tasks:
1. Transcribe all clearly visible text into rawText.
2. Identify the document type with a stable machine-readable value such as passport, identity_card, residence_permit, insurance, bank_statement, birth_certificate, marriage_certificate or unknown.
3. Compare the detected type with the expected document title and set documentMatch.
4. Extract only clearly visible fields. Never invent missing values.
5. Preserve MRZ lines exactly in rawText.
6. Set mrzDetected accurately.
7. Assess image/document readability from 0 to 100.
8. Determine expiryStatus from an explicit expiry date. Use unknown if no reliable date exists.
9. Produce a short summary and one practical nextAction in ${languageNames[input.language]}.
10. Produce warnings and risks in ${languageNames[input.language]}.
11. Field labels must be in ${languageNames[input.language]}.
12. Dates should use DD.MM.YYYY where possible.

Preferred field keys:
givenNames, surname, fullName, passportNumber, identityNumber, documentNumber, birthDate, expiryDate, issueDate, nationality, issuingCountry, placeOfBirth, sex, address, insuranceNumber, policyNumber, iban, bankName.

Do not claim that a document is legally valid or authentic. You may only describe visible quality, extracted data, consistency and possible risks.
`.trim();
}

function parseGeminiResult(
  responseText: string,
): GeminiOcrResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(
      "OCR sağlayıcısının JSON sonucu okunamadı.",
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "OCR sonucu geçerli bir nesne değil.",
    );
  }

  const value =
    parsed as Record<string, unknown>;

  const rawText =
    typeof value.rawText === "string"
      ? value.rawText.trim()
      : "";

  const documentType =
    typeof value.documentType ===
      "string" &&
    value.documentType.trim()
      ? value.documentType.trim()
      : "unknown";

  const fields =
    Array.isArray(value.fields)
      ? value.fields
          .filter(
            (
              field,
            ): field is Record<
              string,
              unknown
            > =>
              Boolean(field) &&
              typeof field === "object",
          )
          .map(normalizeGeminiField)
          .filter(
            (
              field,
            ): field is GeminiField =>
              Boolean(field),
          )
      : [];

  if (
    !rawText &&
    fields.length === 0
  ) {
    throw new Error(
      "Belgeden okunabilir metin veya alan çıkarılamadı.",
    );
  }

  return {
    rawText,
    documentType,
    fields,
    documentMatch:
      normalizeEnum(
        value.documentMatch,
        [
          "match",
          "possible_match",
          "mismatch",
          "unknown",
        ],
        "unknown",
      ),
    qualityScore:
      normalizeNumber(
        value.qualityScore,
        0,
        100,
        0,
      ),
    isReadable:
      typeof value.isReadable ===
      "boolean"
        ? value.isReadable
        : rawText.length > 20,
    mrzDetected:
      typeof value.mrzDetected ===
      "boolean"
        ? value.mrzDetected
        : /P<[A-Z0-9<]{2,}/.test(
            rawText.toUpperCase(),
          ),
    expiryStatus:
      normalizeEnum(
        value.expiryStatus,
        [
          "valid",
          "expiring_soon",
          "expired",
          "not_applicable",
          "unknown",
        ],
        "unknown",
      ),
    summary:
      readString(value.summary),
    nextAction:
      readString(value.nextAction),
    warnings:
      normalizeIssues(
        value.warnings,
      ),
    risks:
      normalizeIssues(value.risks),
  };
}

function normalizeGeminiField(
  field: Record<string, unknown>,
): GeminiField | null {
  const key =
    readString(field.key);
  const label =
    readString(field.label);
  const value =
    readString(field.value);

  if (!key || !label || !value) {
    return null;
  }

  return {
    key,
    label,
    value,
    confidence:
      normalizeNumber(
        field.confidence,
        0,
        1,
        0.5,
      ),
  };
}

function normalizeIssues(
  value: unknown,
): IntelligenceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is Record<
        string,
        unknown
      > =>
        Boolean(item) &&
        typeof item === "object",
    )
    .map((item) => {
      const code =
        readString(item.code);
      const message =
        readString(item.message);
      const severity =
        normalizeEnum(
          item.severity,
          [
            "info",
            "warning",
            "critical",
          ],
          "warning",
        );

      return {
        code,
        message,
        severity,
      };
    })
    .filter(
      (item) =>
        item.code &&
        item.message,
    )
    .slice(0, 10);
}

function normalizeLanguage(
  value: unknown,
): Language {
  return typeof value === "string" &&
    supportedLanguages.includes(
      value as Language,
    )
    ? (value as Language)
    : "tr";
}

function normalizeEnum<
  T extends string,
>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function normalizeNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? Math.min(
        maximum,
        Math.max(minimum, value),
      )
    : fallback;
}

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} alanı gerekli.`,
    );
  }

  return value.trim();
}

function readOptionalString(
  value: unknown,
): string | undefined {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : undefined;
}

function validateFileUrl(
  value: string,
): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(
      "Belge adresi geçerli bir URL değil.",
    );
  }

  if (
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "OCR belge adresi HTTPS kullanmalıdır.",
    );
  }

  const allowedHosts = [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
  ];

  const isAllowedHost =
    allowedHosts.some(
      (host) =>
        parsedUrl.hostname === host ||
        parsedUrl.hostname.endsWith(
          `.${host}`,
        ),
    );

  if (!isAllowedHost) {
    throw new Error(
      "OCR yalnızca Firebase Storage dosyalarını kabul ediyor.",
    );
  }

  return parsedUrl;
}

function normalizeContentType(
  value:
    | string
    | null
    | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return (
    value
      .split(";")[0]
      ?.trim()
      .toLowerCase() || undefined
  );
}

function inferContentTypeFromFileName(
  fileName?: string,
): string | undefined {
  if (!fileName) {
    return undefined;
  }

  const normalized =
    fileName.toLowerCase();

  if (
    normalized.endsWith(".pdf")
  ) {
    return "application/pdf";
  }

  if (
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (
    normalized.endsWith(".png")
  ) {
    return "image/png";
  }

  if (
    normalized.endsWith(".webp")
  ) {
    return "image/webp";
  }

  return undefined;
}

function inferContentTypeFromUrl(
  fileUrl: URL,
): string | undefined {
  return inferContentTypeFromFileName(
    decodeURIComponent(
      fileUrl.pathname,
    ),
  );
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds,
    );
  });
}