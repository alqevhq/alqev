import {
  NextRequest,
  NextResponse,
} from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getPlanLimits,
  normalizeSubscriptionPlan,
} from "@/lib/subscription";
import {
  getExpiryDate,
  getMinuteKey,
  hashIp,
  safeCounter,
  secondsUntilNextMinute,
} from "@/lib/rate-limit";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;
const MAX_RETRIES = 4;
const OCR_USER_REQUESTS_PER_MINUTE = 5;
const OCR_IP_REQUESTS_PER_MINUTE = 15;

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
  let reservedUsage:
    | { userId: string; period: string }
    | null = null;

  try {
    const decodedToken =
      await verifyAuthenticatedUser(request);

    const body = await readRequestBody(request);

    const processId = readRequiredString(
      body.processId,
      "processId",
    );
    const documentKey = readRequiredString(
      body.documentKey,
      "documentKey",
    );
    const requestedFileUrl =
      readRequiredString(body.fileUrl, "fileUrl");
    const language = normalizeLanguage(
      body.language,
    );

    const userReference = adminDb
      .collection("users")
      .doc(decodedToken.uid);
    const processReference = userReference
      .collection("processes")
      .doc(processId);

    const [userSnapshot, processSnapshot] =
      await Promise.all([
        userReference.get(),
        processReference.get(),
      ]);

    if (!userSnapshot.exists) {
      throw new ApiError(
        404,
        "Kullanıcı profili bulunamadı.",
      );
    }

    const userData = userSnapshot.data() ?? {};
    const accountStatus = readOptionalString(
      userData.accountStatus,
    );

    if (
      accountStatus &&
      accountStatus !== "active"
    ) {
      throw new ApiError(
        403,
        "Hesabın şu anda aktif değil.",
      );
    }

    if (!processSnapshot.exists) {
      throw new ApiError(
        404,
        "Bu süreç bulunamadı.",
      );
    }

    const processData =
      processSnapshot.data() ?? {};
    const documents = Array.isArray(
      processData.requiredDocuments,
    )
      ? processData.requiredDocuments.filter(
          (
            item,
          ): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object",
        )
      : [];

    const storedDocument = documents.find(
      (item) =>
        readOptionalString(item.key) ===
        documentKey,
    );

    if (!storedDocument) {
      throw new ApiError(
        404,
        "Bu belge süreç içinde bulunamadı.",
      );
    }

    const storedFileUrl = readRequiredString(
      storedDocument.fileUrl,
      "storedFileUrl",
    );

    if (storedFileUrl !== requestedFileUrl) {
      throw new ApiError(
        403,
        "Belge adresi süreç kaydıyla eşleşmiyor.",
      );
    }

    const expectedStoragePrefix =
      `users/${decodedToken.uid}/processes/${processId}/documents/`;
    const storagePath = readOptionalString(
      storedDocument.storagePath,
    );

    if (
      storagePath &&
      !storagePath.startsWith(
        expectedStoragePrefix,
      )
    ) {
      throw new ApiError(
        403,
        "Belgenin Storage yolu kullanıcıyla eşleşmiyor.",
      );
    }

    const rateLimit = await consumeOcrRateLimit({
      uid: decodedToken.uid,
      ipAddress: getClientIp(request),
    });

    if (!rateLimit.allowed) {
      throw new ApiError(
        429,
        "Çok kısa sürede fazla belge analizi yaptın. Lütfen biraz bekleyip tekrar dene.",
        true,
      );
    }

    const documentTitle =
      readOptionalString(storedDocument.title) ||
      readOptionalString(body.documentTitle) ||
      "Belge";
    const fileName =
      readOptionalString(storedDocument.fileName) ||
      readOptionalString(body.fileName);
    const requestedContentType =
      readOptionalString(
        storedDocument.contentType,
      ) || readOptionalString(body.contentType);

    const parsedFileUrl =
      validateFileUrl(storedFileUrl);

    const fileResponse = await fetch(
      parsedFileUrl,
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
      },
    );

    if (!fileResponse.ok) {
      throw new ApiError(
        400,
        `Belge indirilemedi. HTTP ${fileResponse.status}`,
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
      !ALLOWED_CONTENT_TYPES.has(contentType)
    ) {
      throw new ApiError(
        415,
        "OCR yalnızca PDF, JPG, PNG veya WEBP belgelerini destekliyor.",
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
      throw new ApiError(
        413,
        "Belge 10 MB sınırını aşıyor.",
      );
    }

    const fileBuffer = Buffer.from(
      await fileResponse.arrayBuffer(),
    );

    if (fileBuffer.byteLength === 0) {
      throw new ApiError(
        400,
        "Belge boş görünüyor.",
      );
    }

    if (
      fileBuffer.byteLength > MAX_FILE_SIZE
    ) {
      throw new ApiError(
        413,
        "Belge 10 MB sınırını aşıyor.",
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new ApiError(
        500,
        "GEMINI_API_KEY tanımlı değil.",
      );
    }

    const plan = normalizeSubscriptionPlan(
      userData.subscription,
    );
    const period = getCurrentMonthKey();

    await reserveMonthlyOcrUsage({
      userId: decodedToken.uid,
      period,
      limit: getPlanLimits(plan)
        .maxOCRPerMonth,
    });
    reservedUsage = {
      userId: decodedToken.uid,
      period,
    };

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
        ?.content?.parts?.map(
          (part) => part.text || "",
        )
        .join("")
        .trim() || "";

    if (!responseText) {
      throw new ApiError(
        502,
        "OCR sağlayıcısı boş sonuç döndürdü.",
      );
    }

    const parsedResult =
      parseGeminiResult(responseText);

    reservedUsage = null;

    return NextResponse.json({
      success: true,
      data: {
        processId,
        documentKey,
        documentTitle,
        fileName,
        fileUrl: storedFileUrl,
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
          summary: parsedResult.summary,
          nextAction:
            parsedResult.nextAction,
          warnings: parsedResult.warnings,
          risks: parsedResult.risks,
        },
        analyzedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    if (reservedUsage) {
      try {
        await releaseMonthlyOcrUsage(
          reservedUsage,
        );
      } catch (releaseError) {
        console.error(
          "OCR kullanım rezervasyonu geri alınamadı:",
          releaseError,
        );
      }
    }

    console.error("OCR API hatası:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          retryable: error.retryable,
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "OCR işlemi sırasında bilinmeyen bir hata oluştu.";
    const isTemporaryProviderError =
      isTemporaryGeminiError(message);

    return NextResponse.json(
      {
        error: isTemporaryProviderError
          ? "AI analiz servisi şu anda yoğun. Belgen yüklendi; lütfen kısa süre sonra yeniden analiz et."
          : message,
        retryable: isTemporaryProviderError,
      },
      {
        status: isTemporaryProviderError
          ? 503
          : 400,
      },
    );
  }
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getBearerToken(
  request: NextRequest,
): string {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      "Oturum doğrulama anahtarı bulunamadı.",
    );
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    throw new ApiError(
      401,
      "Oturum doğrulama anahtarı geçersiz.",
    );
  }

  return token;
}

async function verifyAuthenticatedUser(
  request: NextRequest,
) {
  try {
    const decodedToken =
      await adminAuth.verifyIdToken(
        getBearerToken(request),
        true,
      );

    if (decodedToken.email_verified !== true) {
      throw new ApiError(
        403,
        "E-posta adresi doğrulanmamış.",
      );
    }

    return decodedToken;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      401,
      "Oturum doğrulanamadı. Lütfen yeniden giriş yap.",
    );
  }
}

async function readRequestBody(
  request: NextRequest,
): Promise<OcrRequestBody> {
  try {
    return (await request.json()) as OcrRequestBody;
  } catch {
    throw new ApiError(
      400,
      "İstek gövdesi geçerli JSON değil.",
    );
  }
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function getClientIp(
  request: NextRequest,
): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return (
      forwardedFor.split(",")[0]?.trim() ||
      "unknown"
    );
  }

  return (
    request.headers
      .get("x-real-ip")
      ?.trim() ||
    request.headers
      .get("cf-connecting-ip")
      ?.trim() ||
    "unknown"
  );
}

type OcrRateLimitResult =
  | {
      allowed: true;
      remaining: number;
    }
  | {
      allowed: false;
      reason: "user_minute" | "ip_minute";
      retryAfterSeconds: number;
    };

async function consumeOcrRateLimit(input: {
  uid: string;
  ipAddress: string;
}): Promise<OcrRateLimitResult> {
  const now = new Date();
  const minuteKey = getMinuteKey(now);
  const retryAfterSeconds =
    secondsUntilNextMinute(now);
  const ipHash = hashIp(input.ipAddress);
  const expiresAt = getExpiryDate(2);

  const userMinuteReference = adminDb
    .collection("apiRateLimits")
    .doc(
      `ocr_user_${input.uid}_${minuteKey}`,
    );
  const ipMinuteReference = adminDb
    .collection("apiRateLimits")
    .doc(
      `ocr_ip_${ipHash}_${minuteKey}`,
    );

  return adminDb.runTransaction(
    async (transaction) => {
      const [
        userMinuteSnapshot,
        ipMinuteSnapshot,
      ] = await Promise.all([
        transaction.get(
          userMinuteReference,
        ),
        transaction.get(
          ipMinuteReference,
        ),
      ]);

      const userMinuteCount = safeCounter(
        userMinuteSnapshot.data()?.count,
      );
      const ipMinuteCount = safeCounter(
        ipMinuteSnapshot.data()?.count,
      );

      if (
        userMinuteCount >=
        OCR_USER_REQUESTS_PER_MINUTE
      ) {
        return {
          allowed: false,
          reason: "user_minute",
          retryAfterSeconds,
        };
      }

      if (
        ipMinuteCount >=
        OCR_IP_REQUESTS_PER_MINUTE
      ) {
        return {
          allowed: false,
          reason: "ip_minute",
          retryAfterSeconds,
        };
      }

      transaction.set(
        userMinuteReference,
        {
          count: userMinuteCount + 1,
          uid: input.uid,
          kind: "ocr_user_minute",
          updatedAt: now,
          expiresAt,
        },
        { merge: true },
      );

      transaction.set(
        ipMinuteReference,
        {
          count: ipMinuteCount + 1,
          kind: "ocr_ip_minute",
          updatedAt: now,
          expiresAt,
        },
        { merge: true },
      );

      return {
        allowed: true,
        remaining:
          OCR_USER_REQUESTS_PER_MINUTE -
          userMinuteCount -
          1,
      };
    },
  );
}

async function reserveMonthlyOcrUsage(input: {
  userId: string;
  period: string;
  limit: number;
}) {
  const usageReference = adminDb
    .collection("users")
    .doc(input.userId)
    .collection("apiUsage")
    .doc(`ocr-${input.period}`);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(usageReference);
      const currentCount = snapshot.exists
        ? safeCounter(
            snapshot.data()?.count,
          )
        : 0;

      if (
        Number.isFinite(input.limit) &&
        currentCount >= input.limit
      ) {
        throw new ApiError(
          429,
          `Aylık OCR limitine ulaştın (${input.limit}).`,
        );
      }

      transaction.set(
        usageReference,
        {
          type: "ocr",
          period: input.period,
          count: currentCount + 1,
          updatedAt:
            FieldValue.serverTimestamp(),
          ...(snapshot.exists
            ? {}
            : {
                createdAt:
                  FieldValue.serverTimestamp(),
              }),
        },
        { merge: true },
      );
    },
  );
}

async function releaseMonthlyOcrUsage(input: {
  userId: string;
  period: string;
}) {
  const usageReference = adminDb
    .collection("users")
    .doc(input.userId)
    .collection("apiUsage")
    .doc(`ocr-${input.period}`);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(usageReference);

      if (!snapshot.exists) {
        return;
      }

      const currentCount = safeCounter(
        snapshot.data()?.count,
      );

      transaction.update(usageReference, {
        count: Math.max(currentCount - 1, 0),
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    },
  );
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
      const retryDelays = [0, 1200, 2500, 5000];
      await sleep(
        retryDelays[attempt] ?? 5000,
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
      response.status === 504 ||
      (response.status === 400 &&
        isTemporaryGeminiError(lastError));

    if (
      !retryable ||
      attempt === MAX_RETRIES - 1
    ) {
      if (isTemporaryGeminiError(lastError)) {
        throw new Error(
          "AI analiz servisi şu anda yoğun. Lütfen kısa süre sonra yeniden dene.",
        );
      }

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

function isTemporaryGeminiError(
  message: string,
): boolean {
  const normalizedMessage =
    message.trim().toLowerCase();

  return (
    normalizedMessage.includes("high demand") ||
    normalizedMessage.includes("spikes in demand") ||
    normalizedMessage.includes("try again later") ||
    normalizedMessage.includes("temporarily unavailable") ||
    normalizedMessage.includes("resource exhausted") ||
    normalizedMessage.includes("overloaded") ||
    normalizedMessage.includes("capacity") ||
    normalizedMessage.includes("şu anda yoğun") ||
    normalizedMessage.includes("kısa süre sonra yeniden dene")
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