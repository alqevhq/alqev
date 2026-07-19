import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
};

type GeminiField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
};

type GeminiOcrResult = {
  rawText: string;
  documentType: string;
  fields: GeminiField[];
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
    message?: string;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY tanımlı değil. .env.local dosyasını kontrol et.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as OcrRequestBody;

    const processId = readOptionalString(body.processId) || "unknown-process";
    const documentKey = readOptionalString(body.documentKey) || "unknown-document";
    const documentTitle = readOptionalString(body.documentTitle) || "Belge";
    const fileUrl = readRequiredString(body.fileUrl, "fileUrl");
    const fileName = readOptionalString(body.fileName);
    const requestedContentType = readOptionalString(body.contentType);

    const parsedFileUrl = validateFileUrl(fileUrl);

    const fileResponse = await fetch(parsedFileUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        {
          error: `Belge indirilemedi. HTTP ${fileResponse.status}`,
        },
        { status: 400 },
      );
    }

    const responseContentType = normalizeContentType(
      fileResponse.headers.get("content-type"),
    );

    const contentType =
      normalizeContentType(requestedContentType) ||
      responseContentType ||
      inferContentTypeFromFileName(fileName) ||
      inferContentTypeFromUrl(parsedFileUrl);

    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error:
            "OCR yalnızca PDF, JPG, PNG veya WEBP belgelerini destekliyor.",
        },
        { status: 415 },
      );
    }

    const contentLength = Number(
      fileResponse.headers.get("content-length") || "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error: "Belge 10 MB sınırını aşıyor.",
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
          error: "Belge boş görünüyor.",
        },
        { status: 400 },
      );
    }

    if (fileBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Belge 10 MB sınırını aşıyor.",
        },
        { status: 413 },
      );
    }

    const base64File = fileBuffer.toString("base64");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: contentType,
                    data: base64File,
                  },
                },
                {
                  text: buildOcrPrompt({
                    documentTitle,
                    fileName,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                rawText: {
                  type: "STRING",
                  description:
                    "Belgede görülen metnin mümkün olduğunca eksiksiz aktarımı.",
                },
                documentType: {
                  type: "STRING",
                  description:
                    "Belgenin tahmini türü. Örnek: passport, identity_card, residence_permit, insurance, bank_statement, unknown.",
                },
                fields: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      key: {
                        type: "STRING",
                      },
                      label: {
                        type: "STRING",
                      },
                      value: {
                        type: "STRING",
                      },
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
              required: ["rawText", "documentType", "fields"],
            },
          },
        }),
      },
    );

    const geminiPayload =
      (await geminiResponse.json()) as GeminiGenerateContentResponse;

    if (!geminiResponse.ok) {
      console.error("Gemini OCR hatası:", geminiPayload);

      return NextResponse.json(
        {
          error:
            geminiPayload.error?.message ||
            "OCR sağlayıcısı belgeyi analiz edemedi.",
        },
        { status: 502 },
      );
    }

    const responseText =
      geminiPayload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!responseText) {
      return NextResponse.json(
        {
          error: "OCR sağlayıcısı boş sonuç döndürdü.",
        },
        { status: 502 },
      );
    }

    const parsedResult = parseGeminiResult(responseText);

    return NextResponse.json({
      success: true,
      data: {
        processId,
        documentKey,
        documentTitle,
        fileName,
        fileUrl,
        contentType,
        documentType: parsedResult.documentType,
        rawText: parsedResult.rawText,
        fields: parsedResult.fields,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("OCR API hatası:", error);

    const message =
      error instanceof Error
        ? error.message
        : "OCR işlemi sırasında bilinmeyen bir hata oluştu.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}

function buildOcrPrompt(input: {
  documentTitle: string;
  fileName?: string;
}): string {
  return `
Sen HUMANITY OS belge analiz sistemisin.

Belge başlığı: ${input.documentTitle}
Dosya adı: ${input.fileName || "Belirtilmedi"}

Görevin:
1. Belgede görülebilen metni mümkün olduğunca eksiksiz şekilde rawText alanına aktar.
2. Belge türünü belirle.
3. Aşağıdaki alanlardan belgede açıkça görülenleri çıkar.
4. Görünmeyen veya emin olmadığın bilgileri uydurma.
5. Tarihleri mümkünse GG.AA.YYYY biçiminde döndür.
6. confidence değerini 0 ile 1 arasında ver.
7. MRZ satırları varsa rawText içinde aynen koru.
8. Sadece JSON döndür.

Kullanılabilecek standart alan anahtarları:
- givenNames
- surname
- fullName
- passportNumber
- identityNumber
- documentNumber
- birthDate
- expiryDate
- issueDate
- nationality
- issuingCountry
- placeOfBirth
- sex
- address
- insuranceNumber
- policyNumber
- iban
- bankName

Alan etiketi Türkçe olmalıdır.
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

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OCR sonucu geçerli bir nesne değil.");
  }

  const value = parsed as Record<string, unknown>;

  const rawText =
    typeof value.rawText === "string"
      ? value.rawText.trim()
      : "";

  const documentType =
    typeof value.documentType === "string" &&
    value.documentType.trim()
      ? value.documentType.trim()
      : "unknown";

  const fields = Array.isArray(value.fields)
    ? value.fields
        .filter(
          (field): field is Record<string, unknown> =>
            Boolean(field) && typeof field === "object",
        )
        .map(normalizeGeminiField)
        .filter((field): field is GeminiField =>
          Boolean(field),
        )
    : [];

  if (!rawText && fields.length === 0) {
    throw new Error(
      "Belgeden okunabilir metin veya alan çıkarılamadı.",
    );
  }

  return {
    rawText,
    documentType,
    fields,
  };
}

function normalizeGeminiField(
  field: Record<string, unknown>,
): GeminiField | null {
  const key =
    typeof field.key === "string" ? field.key.trim() : "";

  const label =
    typeof field.label === "string"
      ? field.label.trim()
      : "";

  const value =
    typeof field.value === "string"
      ? field.value.trim()
      : "";

  if (!key || !label || !value) {
    return null;
  }

  const confidence =
    typeof field.confidence === "number" &&
    Number.isFinite(field.confidence)
      ? Math.min(1, Math.max(0, field.confidence))
      : 0.5;

  return {
    key,
    label,
    value,
    confidence,
  };
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} alanı gerekli.`);
  }

  return value.trim();
}

function readOptionalString(
  value: unknown,
): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function validateFileUrl(value: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("Belge adresi geçerli bir URL değil.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "OCR belge adresi HTTPS kullanmalıdır.",
    );
  }

  const allowedHosts = [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
  ];

  const isAllowedHost = allowedHosts.some(
    (host) =>
      parsedUrl.hostname === host ||
      parsedUrl.hostname.endsWith(`.${host}`),
  );

  if (!isAllowedHost) {
    throw new Error(
      "OCR yalnızca Firebase Storage dosyalarını kabul ediyor.",
    );
  }

  return parsedUrl;
}

function normalizeContentType(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.split(";")[0]?.trim().toLowerCase() || undefined;
}

function inferContentTypeFromFileName(
  fileName?: string,
): string | undefined {
  if (!fileName) {
    return undefined;
  }

  const normalized = fileName.toLowerCase();

  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (normalized.endsWith(".png")) {
    return "image/png";
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }

  return undefined;
}

function inferContentTypeFromUrl(
  fileUrl: URL,
): string | undefined {
  return inferContentTypeFromFileName(
    decodeURIComponent(fileUrl.pathname),
  );
}