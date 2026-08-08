import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

/**
 * ALQEV AL Memory v2
 *
 * Goals:
 * - Keep long-term user context reliable and explainable.
 * - Never let memory failures break the core chat experience.
 * - Prefer a small amount of useful memory over unlimited noisy memory.
 * - Keep the API backward-compatible with the first AL Memory version.
 */

export type AlMemorySource =
  | "chat"
  | "process"
  | "document"
  | "dashboard"
  | "profile"
  | "system";

export type AlMemoryImportance =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type AlMemoryStatus =
  | "active"
  | "archived";

export type AlMemoryScope =
  | "long_term"
  | "temporary";

export type AlMemoryItem = {
  id: string;
  userId: string;

  source: AlMemorySource;
  importance: AlMemoryImportance;
  status: AlMemoryStatus;
  scope: AlMemoryScope;

  topic: string;
  summary: string;

  goal?: string;
  lastAdvice?: string;

  processId?: string;
  processTitle?: string;

  documentKey?: string;
  documentTitle?: string;

  language?: string;

  tags: string[];

  pinned: boolean;
  confidence: number;

  accessCount: number;

  createdAt: Date | null;
  updatedAt: Date | null;
  lastAccessedAt: Date | null;
  expiresAt: Date | null;
};

export type CreateAlMemoryInput = {
  source: AlMemorySource;
  importance?: AlMemoryImportance;
  status?: AlMemoryStatus;
  scope?: AlMemoryScope;

  topic: string;
  summary: string;

  goal?: string;
  lastAdvice?: string;

  processId?: string;
  processTitle?: string;

  documentKey?: string;
  documentTitle?: string;

  language?: string;

  tags?: string[];

  pinned?: boolean;

  /**
   * 0–100 arası güven puanı.
   * Modelden veya deterministic sistemden gelen hafızalarda
   * güven seviyesini açıkça saklamaya yarar.
   */
  confidence?: number;

  /**
   * Geçici hafızanın kaç gün saklanacağını belirtir.
   * Girilmezse kayıt süresiz saklanır.
   */
  expiresInDays?: number;
};

export type UpdateAlMemoryInput = Partial<
  Omit<
    CreateAlMemoryInput,
    "source" | "expiresInDays"
  >
> & {
  source?: AlMemorySource;
  expiresAt?: Date | null;
};

export type AlMemoryContext = {
  memories: AlMemoryItem[];
  promptContext: string;
};

export type ListAlMemoriesOptions = {
  limit?: number;
  source?: AlMemorySource;
  processId?: string;
  tags?: string[];
  status?: AlMemoryStatus;
  includeArchived?: boolean;
};

const MEMORY_COLLECTION = "alMemory";

const DEFAULT_MEMORY_LIMIT = 12;
const MAX_MEMORY_LIMIT = 50;
const QUERY_FETCH_LIMIT = 100;

const MAX_TEXT_LENGTH = 2_000;
const MAX_TOPIC_LENGTH = 300;
const MAX_ID_LENGTH = 200;
const MAX_LANGUAGE_LENGTH = 20;
const MAX_TAG_COUNT = 20;
const MAX_TAG_LENGTH = 80;

const DEFAULT_CONFIDENCE = 80;

const VALID_SOURCES = new Set<AlMemorySource>([
  "chat",
  "process",
  "document",
  "dashboard",
  "profile",
  "system",
]);

const VALID_IMPORTANCE = new Set<AlMemoryImportance>([
  "low",
  "normal",
  "high",
  "critical",
]);

const VALID_STATUS = new Set<AlMemoryStatus>([
  "active",
  "archived",
]);

const VALID_SCOPE = new Set<AlMemoryScope>([
  "long_term",
  "temporary",
]);

function normalizeText(
  value: unknown,
  maximumLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function normalizeOptionalText(
  value: unknown,
  maximumLength = MAX_TEXT_LENGTH,
): string | undefined {
  const normalized =
    normalizeText(value, maximumLength);

  return normalized || undefined;
}

function normalizeTags(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) =>
          normalizeText(
            item.toLowerCase(),
            MAX_TAG_LENGTH,
          ),
        )
        .filter(Boolean),
    ),
  ).slice(0, MAX_TAG_COUNT);
}

function normalizeLimit(
  value: number | undefined,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_MEMORY_LIMIT;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      MAX_MEMORY_LIMIT,
    ),
  );
}

function normalizeConfidence(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_CONFIDENCE;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

function normalizeCounter(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function normalizeBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function normalizeSource(
  value: unknown,
): AlMemorySource {
  return (
    typeof value === "string" &&
    VALID_SOURCES.has(
      value as AlMemorySource,
    )
  )
    ? (value as AlMemorySource)
    : "system";
}

function normalizeImportance(
  value: unknown,
): AlMemoryImportance {
  return (
    typeof value === "string" &&
    VALID_IMPORTANCE.has(
      value as AlMemoryImportance,
    )
  )
    ? (value as AlMemoryImportance)
    : "normal";
}

function normalizeStatus(
  value: unknown,
): AlMemoryStatus {
  return (
    typeof value === "string" &&
    VALID_STATUS.has(
      value as AlMemoryStatus,
    )
  )
    ? (value as AlMemoryStatus)
    : "active";
}

function normalizeScope(
  value: unknown,
): AlMemoryScope {
  return (
    typeof value === "string" &&
    VALID_SCOPE.has(
      value as AlMemoryScope,
    )
  )
    ? (value as AlMemoryScope)
    : "long_term";
}

function toDate(
  value: unknown,
): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function getExpiresAt(
  expiresInDays: number | undefined,
): Date | null {
  if (
    typeof expiresInDays !== "number" ||
    !Number.isFinite(expiresInDays) ||
    expiresInDays <= 0
  ) {
    return null;
  }

  const expiresAt = new Date();

  expiresAt.setUTCDate(
    expiresAt.getUTCDate() +
      Math.floor(expiresInDays),
  );

  return expiresAt;
}

function getMemoryCollection(
  userId: string,
) {
  const normalizedUserId =
    normalizeText(
      userId,
      MAX_ID_LENGTH,
    );

  if (!normalizedUserId) {
    throw new Error(
      "AL Memory için kullanıcı kimliği gerekli.",
    );
  }

  return adminDb
    .collection("users")
    .doc(normalizedUserId)
    .collection(MEMORY_COLLECTION);
}

function mapMemoryDocument(
  userId: string,
  document:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot,
): AlMemoryItem | null {
  if (!document.exists) {
    return null;
  }

  const data =
    document.data() ?? {};

  const topic =
    normalizeText(
      data.topic,
      MAX_TOPIC_LENGTH,
    );

  const summary =
    normalizeText(data.summary);

  if (!topic || !summary) {
    return null;
  }

  return {
    id: document.id,
    userId,

    source:
      normalizeSource(data.source),

    importance:
      normalizeImportance(
        data.importance,
      ),

    status:
      normalizeStatus(data.status),

    scope:
      normalizeScope(data.scope),

    topic,
    summary,

    goal:
      normalizeOptionalText(
        data.goal,
      ),

    lastAdvice:
      normalizeOptionalText(
        data.lastAdvice,
      ),

    processId:
      normalizeOptionalText(
        data.processId,
        MAX_ID_LENGTH,
      ),

    processTitle:
      normalizeOptionalText(
        data.processTitle,
        MAX_TOPIC_LENGTH,
      ),

    documentKey:
      normalizeOptionalText(
        data.documentKey,
        MAX_ID_LENGTH,
      ),

    documentTitle:
      normalizeOptionalText(
        data.documentTitle,
        MAX_TOPIC_LENGTH,
      ),

    language:
      normalizeOptionalText(
        data.language,
        MAX_LANGUAGE_LENGTH,
      ),

    tags:
      normalizeTags(data.tags),

    pinned:
      normalizeBoolean(data.pinned),

    confidence:
      normalizeConfidence(
        data.confidence,
      ),

    accessCount:
      normalizeCounter(
        data.accessCount,
      ),

    createdAt:
      toDate(data.createdAt),

    updatedAt:
      toDate(data.updatedAt),

    lastAccessedAt:
      toDate(data.lastAccessedAt),

    expiresAt:
      toDate(data.expiresAt),
  };
}

function isExpired(
  memory: AlMemoryItem,
): boolean {
  return Boolean(
    memory.expiresAt &&
      memory.expiresAt.getTime() <=
        Date.now(),
  );
}

function isUsableMemory(
  memory: AlMemoryItem,
): boolean {
  return (
    memory.status === "active" &&
    !isExpired(memory)
  );
}

function memoryImportanceWeight(
  importance: AlMemoryImportance,
): number {
  switch (importance) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "normal":
      return 2;
    case "low":
      return 1;
  }
}

function memoryRecencyScore(
  memory: AlMemoryItem,
): number {
  const time =
    memory.updatedAt?.getTime() ??
    memory.createdAt?.getTime() ??
    0;

  if (!time) {
    return 0;
  }

  const ageInDays =
    Math.max(
      0,
      (Date.now() - time) /
        86_400_000,
    );

  if (ageInDays <= 1) {
    return 4;
  }

  if (ageInDays <= 7) {
    return 3;
  }

  if (ageInDays <= 30) {
    return 2;
  }

  if (ageInDays <= 180) {
    return 1;
  }

  return 0;
}

function memoryRankingScore(
  memory: AlMemoryItem,
): number {
  return (
    memoryImportanceWeight(
      memory.importance,
    ) *
      100 +
    (memory.pinned ? 80 : 0) +
    Math.round(
      memory.confidence * 0.5,
    ) +
    memoryRecencyScore(memory) * 10 +
    Math.min(
      memory.accessCount,
      20,
    )
  );
}

function sortMemories(
  memories: AlMemoryItem[],
): AlMemoryItem[] {
  return [...memories].sort(
    (first, second) => {
      const scoreDifference =
        memoryRankingScore(second) -
        memoryRankingScore(first);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const secondUpdatedAt =
        second.updatedAt?.getTime() ??
        second.createdAt?.getTime() ??
        0;

      const firstUpdatedAt =
        first.updatedAt?.getTime() ??
        first.createdAt?.getTime() ??
        0;

      return (
        secondUpdatedAt -
        firstUpdatedAt
      );
    },
  );
}

function buildCreatePayload(
  input: CreateAlMemoryInput,
) {
  const topic =
    normalizeText(
      input.topic,
      MAX_TOPIC_LENGTH,
    );

  const summary =
    normalizeText(input.summary);

  if (!topic) {
    throw new Error(
      "AL Memory konusu boş olamaz.",
    );
  }

  if (!summary) {
    throw new Error(
      "AL Memory özeti boş olamaz.",
    );
  }

  const expiresAt =
    getExpiresAt(
      input.expiresInDays,
    );

  const scope =
    input.scope ??
    (expiresAt
      ? "temporary"
      : "long_term");

  return {
    source:
      normalizeSource(input.source),

    importance:
      normalizeImportance(
        input.importance,
      ),

    status:
      normalizeStatus(
        input.status,
      ),

    scope:
      normalizeScope(scope),

    topic,
    summary,

    goal:
      normalizeOptionalText(
        input.goal,
      ) ?? null,

    lastAdvice:
      normalizeOptionalText(
        input.lastAdvice,
      ) ?? null,

    processId:
      normalizeOptionalText(
        input.processId,
        MAX_ID_LENGTH,
      ) ?? null,

    processTitle:
      normalizeOptionalText(
        input.processTitle,
        MAX_TOPIC_LENGTH,
      ) ?? null,

    documentKey:
      normalizeOptionalText(
        input.documentKey,
        MAX_ID_LENGTH,
      ) ?? null,

    documentTitle:
      normalizeOptionalText(
        input.documentTitle,
        MAX_TOPIC_LENGTH,
      ) ?? null,

    language:
      normalizeOptionalText(
        input.language,
        MAX_LANGUAGE_LENGTH,
      ) ?? null,

    tags:
      normalizeTags(input.tags),

    pinned:
      input.pinned === true,

    confidence:
      normalizeConfidence(
        input.confidence,
      ),

    accessCount: 0,

    lastAccessedAt: null,

    expiresAt:
      expiresAt
        ? Timestamp.fromDate(
            expiresAt,
          )
        : null,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),
  };
}

export async function createAlMemory(
  userId: string,
  input: CreateAlMemoryInput,
): Promise<AlMemoryItem> {
  const reference =
    getMemoryCollection(userId).doc();

  await reference.set(
    buildCreatePayload(input),
  );

  const snapshot =
    await reference.get();

  const memory =
    mapMemoryDocument(
      userId,
      snapshot,
    );

  if (!memory) {
    throw new Error(
      "AL Memory kaydı oluşturuldu ancak okunamadı.",
    );
  }

  return memory;
}

export async function updateAlMemory(
  userId: string,
  memoryId: string,
  input: UpdateAlMemoryInput,
): Promise<AlMemoryItem> {
  const normalizedMemoryId =
    normalizeText(
      memoryId,
      MAX_ID_LENGTH,
    );

  if (!normalizedMemoryId) {
    throw new Error(
      "AL Memory kimliği gerekli.",
    );
  }

  const updateData:
    Record<string, unknown> = {
      updatedAt:
        FieldValue.serverTimestamp(),
    };

  if (input.source !== undefined) {
    updateData.source =
      normalizeSource(input.source);
  }

  if (
    input.importance !== undefined
  ) {
    updateData.importance =
      normalizeImportance(
        input.importance,
      );
  }

  if (input.status !== undefined) {
    updateData.status =
      normalizeStatus(input.status);
  }

  if (input.scope !== undefined) {
    updateData.scope =
      normalizeScope(input.scope);
  }

  if (input.pinned !== undefined) {
    updateData.pinned =
      input.pinned === true;
  }

  if (
    input.confidence !== undefined
  ) {
    updateData.confidence =
      normalizeConfidence(
        input.confidence,
      );
  }

  if (input.topic !== undefined) {
    const topic =
      normalizeText(
        input.topic,
        MAX_TOPIC_LENGTH,
      );

    if (!topic) {
      throw new Error(
        "AL Memory konusu boş olamaz.",
      );
    }

    updateData.topic = topic;
  }

  if (input.summary !== undefined) {
    const summary =
      normalizeText(
        input.summary,
      );

    if (!summary) {
      throw new Error(
        "AL Memory özeti boş olamaz.",
      );
    }

    updateData.summary = summary;
  }

  const optionalTextFields = [
    "goal",
    "lastAdvice",
    "processId",
    "processTitle",
    "documentKey",
    "documentTitle",
    "language",
  ] as const;

  for (
    const field of
      optionalTextFields
  ) {
    if (input[field] !== undefined) {
      const maximumLength =
        field === "processId" ||
        field === "documentKey"
          ? MAX_ID_LENGTH
          : field === "language"
            ? MAX_LANGUAGE_LENGTH
            : field ===
                  "processTitle" ||
                field ===
                  "documentTitle"
              ? MAX_TOPIC_LENGTH
              : MAX_TEXT_LENGTH;

      updateData[field] =
        normalizeOptionalText(
          input[field],
          maximumLength,
        ) ?? null;
    }
  }

  if (input.tags !== undefined) {
    updateData.tags =
      normalizeTags(input.tags);
  }

  if (
    input.expiresAt !== undefined
  ) {
    updateData.expiresAt =
      input.expiresAt
        ? Timestamp.fromDate(
            input.expiresAt,
          )
        : null;
  }

  const reference =
    getMemoryCollection(userId)
      .doc(normalizedMemoryId);

  await reference.set(
    updateData,
    { merge: true },
  );

  const snapshot =
    await reference.get();

  const memory =
    mapMemoryDocument(
      userId,
      snapshot,
    );

  if (!memory) {
    throw new Error(
      "AL Memory kaydı güncellendi ancak okunamadı.",
    );
  }

  return memory;
}

export async function archiveAlMemory(
  userId: string,
  memoryId: string,
): Promise<AlMemoryItem> {
  return updateAlMemory(
    userId,
    memoryId,
    {
      status: "archived",
    },
  );
}

export async function restoreAlMemory(
  userId: string,
  memoryId: string,
): Promise<AlMemoryItem> {
  return updateAlMemory(
    userId,
    memoryId,
    {
      status: "active",
    },
  );
}

export async function pinAlMemory(
  userId: string,
  memoryId: string,
  pinned = true,
): Promise<AlMemoryItem> {
  return updateAlMemory(
    userId,
    memoryId,
    { pinned },
  );
}

export async function deleteAlMemory(
  userId: string,
  memoryId: string,
): Promise<void> {
  const normalizedMemoryId =
    normalizeText(
      memoryId,
      MAX_ID_LENGTH,
    );

  if (!normalizedMemoryId) {
    throw new Error(
      "AL Memory kimliği gerekli.",
    );
  }

  await getMemoryCollection(userId)
    .doc(normalizedMemoryId)
    .delete();
}

export async function getAlMemory(
  userId: string,
  memoryId: string,
): Promise<AlMemoryItem | null> {
  const normalizedMemoryId =
    normalizeText(
      memoryId,
      MAX_ID_LENGTH,
    );

  if (!normalizedMemoryId) {
    return null;
  }

  const reference =
    getMemoryCollection(userId)
      .doc(normalizedMemoryId);

  const snapshot =
    await reference.get();

  const memory =
    mapMemoryDocument(
      userId,
      snapshot,
    );

  if (
    !memory ||
    !isUsableMemory(memory)
  ) {
    return null;
  }

  return memory;
}

export async function markAlMemoriesAccessed(
  userId: string,
  memoryIds: string[],
): Promise<void> {
  const ids =
    Array.from(
      new Set(
        memoryIds
          .map((id) =>
            normalizeText(
              id,
              MAX_ID_LENGTH,
            ),
          )
          .filter(Boolean),
      ),
    ).slice(0, MAX_MEMORY_LIMIT);

  if (ids.length === 0) {
    return;
  }

  const batch =
    adminDb.batch();

  for (const id of ids) {
    const reference =
      getMemoryCollection(userId)
        .doc(id);

    batch.set(
      reference,
      {
        accessCount:
          FieldValue.increment(1),
        lastAccessedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

export async function listAlMemories(
  userId: string,
  options?: ListAlMemoriesOptions,
): Promise<AlMemoryItem[]> {
  const limit =
    normalizeLimit(
      options?.limit,
    );

  /**
   * Burada bilinçli olarak yalnızca updatedAt ile sorguluyoruz.
   * source/process/status gibi ek where + orderBy kombinasyonları
   * gereksiz Firestore composite index ihtiyacı oluşturmasın.
   * Kullanıcı başına en fazla 100 güncel kayıt çekilip
   * uygulama tarafında filtreleniyor.
   */
  const snapshot =
    await getMemoryCollection(userId)
      .orderBy(
        "updatedAt",
        "desc",
      )
      .limit(
        Math.min(
          QUERY_FETCH_LIMIT,
          Math.max(
            limit * 4,
            30,
          ),
        ),
      )
      .get();

  const requestedTags =
    normalizeTags(
      options?.tags,
    );

  const normalizedProcessId =
    options?.processId
      ? normalizeText(
          options.processId,
          MAX_ID_LENGTH,
        )
      : "";

  const memories =
    snapshot.docs
      .map((document) =>
        mapMemoryDocument(
          userId,
          document,
        ),
      )
      .filter(
        (
          memory,
        ): memory is AlMemoryItem =>
          memory !== null,
      )
      .filter((memory) => {
        if (isExpired(memory)) {
          return false;
        }

        if (
          !options?.includeArchived &&
          memory.status !== "active"
        ) {
          return false;
        }

        if (
          options?.status &&
          memory.status !==
            options.status
        ) {
          return false;
        }

        if (
          options?.source &&
          memory.source !==
            options.source
        ) {
          return false;
        }

        if (
          normalizedProcessId &&
          memory.processId !==
            normalizedProcessId
        ) {
          return false;
        }

        if (
          requestedTags.length > 0 &&
          !requestedTags.some(
            (tag) =>
              memory.tags.includes(tag),
          )
        ) {
          return false;
        }

        return true;
      });

  return sortMemories(
    memories,
  ).slice(0, limit);
}

function buildSearchWords(
  searchText: string,
): string[] {
  return Array.from(
    new Set(
      normalizeText(
        searchText.toLowerCase(),
        500,
      )
        .split(
          /[\s,.;:!?()[\]{}"'`/\\|_-]+/,
        )
        .map((word) =>
          word.trim(),
        )
        .filter(
          (word) =>
            word.length >= 2,
        ),
    ),
  ).slice(0, 30);
}

function calculateSearchScore(
  memory: AlMemoryItem,
  words: string[],
): number {
  const topic =
    memory.topic.toLowerCase();

  const tags =
    memory.tags.join(" ")
      .toLowerCase();

  const haystack = [
    memory.topic,
    memory.summary,
    memory.goal,
    memory.lastAdvice,
    memory.processTitle,
    memory.documentTitle,
    ...memory.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const word of words) {
    if (topic.includes(word)) {
      score += 6;
    }

    if (tags.includes(word)) {
      score += 5;
    }

    if (haystack.includes(word)) {
      score += 2;
    }
  }

  score +=
    memoryImportanceWeight(
      memory.importance,
    ) * 2;

  if (memory.pinned) {
    score += 4;
  }

  score +=
    Math.round(
      memory.confidence / 25,
    );

  return score;
}

export async function findAlMemories(
  userId: string,
  searchText: string,
  options?: {
    limit?: number;
  },
): Promise<AlMemoryItem[]> {
  const words =
    buildSearchWords(
      searchText,
    );

  if (words.length === 0) {
    return [];
  }

  const memories =
    await listAlMemories(
      userId,
      {
        limit: MAX_MEMORY_LIMIT,
      },
    );

  const ranked =
    memories
      .map((memory) => ({
        memory,
        score:
          calculateSearchScore(
            memory,
            words,
          ),
      }))
      .filter(
        ({ score }) =>
          score > 0,
      )
      .sort(
        (first, second) => {
          if (
            second.score !==
            first.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          return (
            memoryRankingScore(
              second.memory,
            ) -
            memoryRankingScore(
              first.memory,
            )
          );
        },
      )
      .slice(
        0,
        normalizeLimit(
          options?.limit,
        ),
      )
      .map(
        ({ memory }) => memory,
      );

  /**
   * Okuma istatistiği yardımcı bir sinyaldir.
   * Bunun başarısız olması hafızanın dönmesini engellemez.
   */
  if (ranked.length > 0) {
    void markAlMemoriesAccessed(
      userId,
      ranked.map(
        (memory) => memory.id,
      ),
    ).catch((error) => {
      console.error(
        "AL Memory erişim bilgisi güncellenemedi:",
        error,
      );
    });
  }

  return ranked;
}

export function buildAlMemoryPromptContext(
  memories: AlMemoryItem[],
): string {
  const usableMemories =
    sortMemories(
      memories.filter(
        isUsableMemory,
      ),
    );

  if (
    usableMemories.length === 0
  ) {
    return "";
  }

  const lines =
    usableMemories.map(
      (memory, index) => {
        const details = [
          `Topic: ${memory.topic}`,
          `Summary: ${memory.summary}`,
          memory.goal
            ? `Goal: ${memory.goal}`
            : "",
          memory.lastAdvice
            ? `Previous guidance: ${memory.lastAdvice}`
            : "",
          memory.processTitle
            ? `Process: ${memory.processTitle}`
            : "",
          memory.documentTitle
            ? `Document: ${memory.documentTitle}`
            : "",
          memory.tags.length > 0
            ? `Tags: ${memory.tags.join(", ")}`
            : "",
          `Confidence: ${memory.confidence}/100`,
        ].filter(Boolean);

        return `${index + 1}. ${details.join(" | ")}`;
      },
    );

  return [
    "ALQEV USER MEMORY",
    "The following items are saved context from earlier conversations or ALQEV data.",
    "Use them only when they are relevant to the current request.",
    "Treat memory as contextual evidence, not as guaranteed current truth.",
    "If the user's current message conflicts with saved memory, the current message wins.",
    "Never reveal internal memory metadata unless the user explicitly asks to manage their saved memory.",
    "",
    ...lines,
  ].join("\n");
}

export async function getAlMemoryContext(
  userId: string,
  options?: {
    searchText?: string;
    limit?: number;
  },
): Promise<AlMemoryContext> {
  const memories =
    options?.searchText
      ? await findAlMemories(
          userId,
          options.searchText,
          {
            limit:
              options.limit,
          },
        )
      : await listAlMemories(
          userId,
          {
            limit:
              options?.limit,
          },
        );

  return {
    memories,
    promptContext:
      buildAlMemoryPromptContext(
        memories,
      ),
  };
}

export async function upsertAlMemoryByTopic(
  userId: string,
  input: CreateAlMemoryInput,
): Promise<AlMemoryItem> {
  const normalizedTopic =
    normalizeText(
      input.topic,
      MAX_TOPIC_LENGTH,
    ).toLowerCase();

  if (!normalizedTopic) {
    throw new Error(
      "AL Memory konusu boş olamaz.",
    );
  }

  const candidates =
    await listAlMemories(
      userId,
      {
        limit: MAX_MEMORY_LIMIT,
        source: input.source,
      },
    );

  const existing =
    candidates.find(
      (memory) =>
        memory.topic
          .toLowerCase() ===
          normalizedTopic &&
        (input.processId
          ? memory.processId ===
            normalizeText(
              input.processId,
              MAX_ID_LENGTH,
            )
          : true),
    );

  if (!existing) {
    return createAlMemory(
      userId,
      input,
    );
  }

  const expiresAt =
    getExpiresAt(
      input.expiresInDays,
    );

  return updateAlMemory(
    userId,
    existing.id,
    {
      source:
        input.source,

      importance:
        input.importance,

      status:
        input.status,

      scope:
        input.scope ??
        (expiresAt
          ? "temporary"
          : undefined),

      topic:
        input.topic,

      summary:
        input.summary,

      goal:
        input.goal,

      lastAdvice:
        input.lastAdvice,

      processId:
        input.processId,

      processTitle:
        input.processTitle,

      documentKey:
        input.documentKey,

      documentTitle:
        input.documentTitle,

      language:
        input.language,

      tags:
        input.tags,

      pinned:
        input.pinned,

      confidence:
        input.confidence,

      expiresAt,
    },
  );
}

export async function deleteExpiredAlMemories(
  userId: string,
): Promise<number> {
  const snapshot =
    await getMemoryCollection(userId)
      .where(
        "expiresAt",
        "<=",
        Timestamp.now(),
      )
      .limit(100)
      .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch =
    adminDb.batch();

  for (
    const document of
      snapshot.docs
  ) {
    batch.delete(document.ref);
  }

  await batch.commit();

  return snapshot.size;
}