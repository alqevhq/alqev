import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuth,
} from "@/lib/firebase-admin";

import {
  createChat,
  deleteChat,
  getChatConversation,
  listChats,
  renameChat,
  saveChatExchange,
} from "@/lib/ai/chat-history";

async function getUserId(
  request: NextRequest,
): Promise<string | null> {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    return null;
  }

  try {
    const decoded =
      await adminAuth
        .verifyIdToken(token);

    return decoded.uid;
  } catch {
    return null;
  }
}

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function readStringArray(
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
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
) {
  try {
    const userId =
      await getUserId(
        request,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Oturum geçersiz.",
        },
        {
          status: 401,
        },
      );
    }

    const url =
      new URL(
        request.url,
      );

    const chatId =
      readString(
        url.searchParams.get(
          "chatId",
        ),
      );

    if (chatId) {
      const conversation =
        await getChatConversation(
          userId,
          chatId,
        );

      if (!conversation) {
        return NextResponse.json(
          {
            error:
              "Sohbet bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        success: true,
        data: conversation,
      });
    }

    const chats =
      await listChats(
        userId,
        50,
      );

    return NextResponse.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    console.error(
      "Chat history GET hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Sohbet geçmişi yüklenemedi.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const userId =
      await getUserId(
        request,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Oturum geçersiz.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const action =
      readString(
        body.action,
      );

    if (action === "saveExchange") {
      const userMessage =
        body.userMessage &&
        typeof body.userMessage === "object"
          ? (body.userMessage as Record<string, unknown>)
          : {};

      const assistantMessage =
        body.assistantMessage &&
        typeof body.assistantMessage === "object"
          ? (body.assistantMessage as Record<string, unknown>)
          : {};

      const userContent =
        readString(
          userMessage.content,
        );

      const assistantContent =
        readString(
          assistantMessage.content,
        );

      if (!userContent || !assistantContent) {
        return NextResponse.json(
          {
            error:
              "Kullanıcı ve AL mesajı gerekli.",
          },
          {
            status: 400,
          },
        );
      }

      const result =
        await saveChatExchange({
          userId,
          chatId:
            readString(
              body.chatId,
            ) || null,
          language:
            readString(
              body.language,
            ) || "tr",
          userMessage: {
            content:
              userContent,
            attachmentName:
              readString(
                userMessage.attachmentName,
              ) || undefined,
          },
          assistantMessage: {
            content:
              assistantContent,
            category:
              readString(
                assistantMessage.category,
              ) || undefined,
            topic:
              readString(
                assistantMessage.topic,
              ) || undefined,
            suggestedActions:
              readStringArray(
                assistantMessage.suggestedActions,
              ),
            officialBodies:
              readStringArray(
                assistantMessage.officialBodies,
              ),
            importantNotice:
              readString(
                assistantMessage.importantNotice,
              ) || undefined,
          },
        });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const chat =
      await createChat(
        userId,
        {
          title:
            readString(
              body.title,
            ) ||
            "Yeni sohbet",

          language:
            readString(
              body.language,
            ) ||
            "tr",
        },
      );

    return NextResponse.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error(
      "Chat history POST hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Sohbet geçmişi kaydedilemedi.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const userId =
      await getUserId(
        request,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Oturum geçersiz.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as {
        chatId?: unknown;
        title?: unknown;
      };

    const chatId =
      readString(
        body.chatId,
      );

    const title =
      readString(
        body.title,
      );

    if (
      !chatId ||
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "chatId ve title gerekli.",
        },
        {
          status: 400,
        },
      );
    }

    await renameChat(
      userId,
      chatId,
      title,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Chat history PATCH hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Sohbet başlığı değiştirilemedi.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const userId =
      await getUserId(
        request,
      );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Oturum geçersiz.",
        },
        {
          status: 401,
        },
      );
    }

    const url =
      new URL(
        request.url,
      );

    const chatId =
      readString(
        url.searchParams.get(
          "chatId",
        ),
      );

    if (!chatId) {
      return NextResponse.json(
        {
          error:
            "chatId gerekli.",
        },
        {
          status: 400,
        },
      );
    }

    await deleteChat(
      userId,
      chatId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Chat history DELETE hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Sohbet silinemedi.",
      },
      {
        status: 500,
      },
    );
  }
}