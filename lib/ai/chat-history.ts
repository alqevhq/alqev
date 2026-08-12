import "server-only";

import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

export type StoredChatRole =
  | "user"
  | "assistant";

export type StoredChatMessage = {
  id: string;
  role: StoredChatRole;
  content: string;
  attachmentName?: string;
  category?: string;
  topic?: string;
  suggestedActions?: string[];
  officialBodies?: string[];
  importantNotice?: string;
  createdAt: Date | null;
};

export type StoredChatSummary = {
  id: string;
  title: string;
  language: string;
  lastMessagePreview: string;
  messageCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type StoredChatConversation = {
  chat: StoredChatSummary;
  messages: StoredChatMessage[];
};

export type SaveChatExchangeInput = {
  userId: string;
  chatId?: string | null;
  language: string;

  userMessage: {
    content: string;
    attachmentName?: string;
  };

  assistantMessage: {
    content: string;
    category?: string;
    topic?: string;
    suggestedActions?: string[];
    officialBodies?: string[];
    importantNotice?: string;
  };
};

const CHAT_COLLECTION =
  "chats";

const MESSAGE_COLLECTION =
  "messages";

const DEFAULT_CHAT_LIMIT =
  50;

const MAX_CHAT_LIMIT =
  100;

const MAX_TITLE_LENGTH =
  80;

const MAX_CONTENT_LENGTH =
  12_000;

const MAX_PREVIEW_LENGTH =
  160;

const MAX_ARRAY_ITEMS =
  10;

const MAX_ARRAY_ITEM_LENGTH =
  500;

function normalizeText(
  value: unknown,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeOneLine(
  value: unknown,
  maximumLength: number,
): string {
  return normalizeText(
    value,
    maximumLength,
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLanguage(
  value: unknown,
): string {
  const normalized =
    normalizeOneLine(
      value,
      20,
    );

  return normalized || "tr";
}

function normalizeStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) =>
      normalizeOneLine(
        item,
        MAX_ARRAY_ITEM_LENGTH,
      ),
    )
    .filter(Boolean)
    .slice(
      0,
      MAX_ARRAY_ITEMS,
    );
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

function normalizeUserId(
  value: string,
): string {
  const normalized =
    normalizeOneLine(
      value,
      200,
    );

  if (!normalized) {
    throw new Error(
      "Chat history için userId gerekli.",
    );
  }

  return normalized;
}

function normalizeChatId(
  value: string,
): string {
  const normalized =
    normalizeOneLine(
      value,
      200,
    );

  if (!normalized) {
    throw new Error(
      "Chat history için chatId gerekli.",
    );
  }

  return normalized;
}

function getChatCollection(
  userId: string,
) {
  return adminDb
    .collection("users")
    .doc(
      normalizeUserId(
        userId,
      ),
    )
    .collection(
      CHAT_COLLECTION,
    );
}

function getMessageCollection(
  userId: string,
  chatId: string,
) {
  return getChatCollection(
    userId,
  )
    .doc(
      normalizeChatId(
        chatId,
      ),
    )
    .collection(
      MESSAGE_COLLECTION,
    );
}

function createTitleFromMessage(
  content: string,
  attachmentName?: string,
): string {
  const cleaned =
    normalizeOneLine(
      content,
      MAX_TITLE_LENGTH,
    );

  if (cleaned) {
    return cleaned;
  }

  const attachment =
    normalizeOneLine(
      attachmentName,
      MAX_TITLE_LENGTH,
    );

  if (attachment) {
    return `Belge: ${attachment}`;
  }

  return "Yeni sohbet";
}

function createPreview(
  content: string,
): string {
  return normalizeOneLine(
    content,
    MAX_PREVIEW_LENGTH,
  );
}

function mapChatDocument(
  document:
    FirebaseFirestore.DocumentSnapshot,
): StoredChatSummary | null {
  if (!document.exists) {
    return null;
  }

  const data =
    document.data() ?? {};

  return {
    id: document.id,

    title:
      normalizeOneLine(
        data.title,
        MAX_TITLE_LENGTH,
      ) ||
      "Yeni sohbet",

    language:
      normalizeLanguage(
        data.language,
      ),

    lastMessagePreview:
      normalizeOneLine(
        data.lastMessagePreview,
        MAX_PREVIEW_LENGTH,
      ),

    messageCount:
      typeof data.messageCount ===
        "number" &&
      Number.isFinite(
        data.messageCount,
      )
        ? Math.max(
            0,
            Math.floor(
              data.messageCount,
            ),
          )
        : 0,

    createdAt:
      toDate(
        data.createdAt,
      ),

    updatedAt:
      toDate(
        data.updatedAt,
      ),
  };
}

function mapMessageDocument(
  document:
    FirebaseFirestore.QueryDocumentSnapshot,
): StoredChatMessage | null {
  const data =
    document.data() ?? {};

  const role:
    StoredChatRole | null =
    data.role === "user"
      ? "user"
      : data.role ===
          "assistant"
        ? "assistant"
        : null;

  const content =
    normalizeText(
      data.content,
      MAX_CONTENT_LENGTH,
    );

  if (!role || !content) {
    return null;
  }

  return {
    id: document.id,
    role,
    content,

    attachmentName:
      normalizeOneLine(
        data.attachmentName,
        200,
      ) || undefined,

    category:
      normalizeOneLine(
        data.category,
        100,
      ) || undefined,

    topic:
      normalizeOneLine(
        data.topic,
        300,
      ) || undefined,

    suggestedActions:
      normalizeStringArray(
        data.suggestedActions,
      ),

    officialBodies:
      normalizeStringArray(
        data.officialBodies,
      ),

    importantNotice:
      normalizeText(
        data.importantNotice,
        2_000,
      ) || undefined,

    createdAt:
      toDate(
        data.createdAt,
      ),
  };
}

export async function createChat(
  userId: string,
  input?: {
    language?: string;
    title?: string;
  },
): Promise<StoredChatSummary> {
  const reference =
    getChatCollection(
      userId,
    ).doc();

  const title =
    normalizeOneLine(
      input?.title,
      MAX_TITLE_LENGTH,
    ) ||
    "Yeni sohbet";

  await reference.set({
    title,

    language:
      normalizeLanguage(
        input?.language,
      ),

    lastMessagePreview:
      "",

    messageCount:
      0,

    createdAt:
      FieldValue
        .serverTimestamp(),

    updatedAt:
      FieldValue
        .serverTimestamp(),
  });

  const snapshot =
    await reference.get();

  const chat =
    mapChatDocument(
      snapshot,
    );

  if (!chat) {
    throw new Error(
      "Sohbet oluşturuldu ancak okunamadı.",
    );
  }

  return chat;
}

export async function saveChatExchange(
  input: SaveChatExchangeInput,
): Promise<{
  chatId: string;
}> {
  const userId =
    normalizeUserId(
      input.userId,
    );

  const userContent =
    normalizeText(
      input.userMessage
        .content,
      MAX_CONTENT_LENGTH,
    );

  const assistantContent =
    normalizeText(
      input.assistantMessage
        .content,
      MAX_CONTENT_LENGTH,
    );

  if (
    !userContent ||
    !assistantContent
  ) {
    throw new Error(
      "Sohbet mesajları boş olamaz.",
    );
  }

  let chatId =
    input.chatId
      ? normalizeChatId(
          input.chatId,
        )
      : "";

  if (!chatId) {
    const newChat =
      await createChat(
        userId,
        {
          language:
            input.language,

          title:
            createTitleFromMessage(
              userContent,
              input.userMessage
                .attachmentName,
            ),
        },
      );

    chatId =
      newChat.id;
  }

  const chatReference =
    getChatCollection(
      userId,
    ).doc(
      chatId,
    );

  const userMessageReference =
    getMessageCollection(
      userId,
      chatId,
    ).doc();

  const assistantMessageReference =
    getMessageCollection(
      userId,
      chatId,
    ).doc();

  const batch =
    adminDb.batch();

  batch.set(
    userMessageReference,
    {
      role: "user",

      content:
        userContent,

      attachmentName:
        normalizeOneLine(
          input.userMessage
            .attachmentName,
          200,
        ) || null,

      createdAt:
        FieldValue
          .serverTimestamp(),
    },
  );

  batch.set(
    assistantMessageReference,
    {
      role:
        "assistant",

      content:
        assistantContent,

      category:
        normalizeOneLine(
          input.assistantMessage
            .category,
          100,
        ) || null,

      topic:
        normalizeOneLine(
          input.assistantMessage
            .topic,
          300,
        ) || null,

      suggestedActions:
        normalizeStringArray(
          input.assistantMessage
            .suggestedActions,
        ),

      officialBodies:
        normalizeStringArray(
          input.assistantMessage
            .officialBodies,
        ),

      importantNotice:
        normalizeText(
          input.assistantMessage
            .importantNotice,
          2_000,
        ) || null,

      createdAt:
        FieldValue
          .serverTimestamp(),
    },
  );

  batch.set(
    chatReference,
    {
      language:
        normalizeLanguage(
          input.language,
        ),

      lastMessagePreview:
        createPreview(
          assistantContent,
        ),

      messageCount:
        FieldValue
          .increment(2),

      updatedAt:
        FieldValue
          .serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  await batch.commit();

  return {
    chatId,
  };
}

export async function listChats(
  userId: string,
  limit =
    DEFAULT_CHAT_LIMIT,
): Promise<StoredChatSummary[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        MAX_CHAT_LIMIT,
        Math.floor(
          Number.isFinite(
            limit,
          )
            ? limit
            : DEFAULT_CHAT_LIMIT,
        ),
      ),
    );

  const snapshot =
    await getChatCollection(
      userId,
    )
      .orderBy(
        "updatedAt",
        "desc",
      )
      .limit(
        safeLimit,
      )
      .get();

  return snapshot.docs
    .map((document) =>
      mapChatDocument(
        document,
      ),
    )
    .filter(
      (
        chat,
      ): chat is StoredChatSummary =>
        chat !== null,
    );
}

export async function getChatConversation(
  userId: string,
  chatId: string,
): Promise<
  StoredChatConversation | null
> {
  const chatReference =
    getChatCollection(
      userId,
    ).doc(
      normalizeChatId(
        chatId,
      ),
    );

  const [
    chatSnapshot,
    messageSnapshot,
  ] =
    await Promise.all([
      chatReference.get(),

      chatReference
        .collection(
          MESSAGE_COLLECTION,
        )
        .orderBy(
          "createdAt",
          "asc",
        )
        .limit(
          500,
        )
        .get(),
    ]);

  const chat =
    mapChatDocument(
      chatSnapshot,
    );

  if (!chat) {
    return null;
  }

  const messages =
    messageSnapshot.docs
      .map(
        mapMessageDocument,
      )
      .filter(
        (
          message,
        ): message is StoredChatMessage =>
          message !== null,
      );

  return {
    chat,
    messages,
  };
}

export async function renameChat(
  userId: string,
  chatId: string,
  title: string,
): Promise<void> {
  const normalizedTitle =
    normalizeOneLine(
      title,
      MAX_TITLE_LENGTH,
    );

  if (!normalizedTitle) {
    throw new Error(
      "Sohbet başlığı boş olamaz.",
    );
  }

  await getChatCollection(
    userId,
  )
    .doc(
      normalizeChatId(
        chatId,
      ),
    )
    .set(
      {
        title:
          normalizedTitle,

        updatedAt:
          FieldValue
            .serverTimestamp(),
      },
      {
        merge: true,
      },
    );
}

export async function deleteChat(
  userId: string,
  chatId: string,
): Promise<void> {
  const normalizedChatId =
    normalizeChatId(
      chatId,
    );

  const chatReference =
    getChatCollection(
      userId,
    ).doc(
      normalizedChatId,
    );

  const messagesReference =
    chatReference.collection(
      MESSAGE_COLLECTION,
    );

  while (true) {
    const snapshot =
      await messagesReference
        .limit(400)
        .get();

    if (snapshot.empty) {
      break;
    }

    const batch =
      adminDb.batch();

    for (
      const document
      of snapshot.docs
    ) {
      batch.delete(
        document.ref,
      );
    }

    await batch.commit();

    if (
      snapshot.size <
      400
    ) {
      break;
    }
  }

  await chatReference.delete();
}