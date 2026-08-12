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
      (await request.json()) as {
        title?: unknown;
        language?: unknown;
      };

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
          "Yeni sohbet oluşturulamadı.",
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