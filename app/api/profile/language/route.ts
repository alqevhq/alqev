import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

const supportedLanguages = new Set([
  "de",
  "en",
  "tr",
  "ru",
  "ar",
  "fa",
]);

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function POST(request: Request) {
  let stage = "request-started";

  try {
    stage = "loading-firebase-admin";
    const { adminAuth, adminDb } = await import("@/lib/firebase-admin");

    stage = "reading-token";
    const idToken = getBearerToken(request);

    if (!idToken) {
      return NextResponse.json(
        {
          error: "Authorization token bulunamadı.",
          stage,
        },
        { status: 401 },
      );
    }

    stage = "verifying-token";
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    stage = "checking-email";
    if (decodedToken.email_verified !== true) {
      return NextResponse.json(
        {
          error: "E-posta adresi doğrulanmamış.",
          stage,
        },
        { status: 403 },
      );
    }

    stage = "reading-request-body";
    const body = (await request.json()) as {
      language?: unknown;
    };

    stage = "validating-language";
    if (
      typeof body.language !== "string" ||
      !supportedLanguages.has(body.language)
    ) {
      return NextResponse.json(
        {
          error: "Geçersiz dil tercihi.",
          stage,
          receivedLanguage: body.language ?? null,
        },
        { status: 400 },
      );
    }

    stage = "writing-firestore";
    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        language: body.language,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      success: true,
      language: body.language,
      stage: "completed",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("LANGUAGE API ERROR", {
      stage,
      message,
      error,
    });

    return NextResponse.json(
      {
        error: message,
        stage,
      },
      { status: 500 },
    );
  }
}