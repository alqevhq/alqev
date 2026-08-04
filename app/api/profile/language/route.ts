import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
  try {
    const idToken = getBearerToken(request);

    if (!idToken) {
      return NextResponse.json(
        { error: "Oturum doğrulanamadı." },
        { status: 401 },
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    if (decodedToken.email_verified !== true) {
      return NextResponse.json(
        { error: "E-posta adresi doğrulanmamış." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      language?: unknown;
    };

    if (
      typeof body.language !== "string" ||
      !supportedLanguages.has(body.language)
    ) {
      return NextResponse.json(
        { error: "Geçersiz dil tercihi." },
        { status: 400 },
      );
    }

    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        language: body.language,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dil tercihi API hatası:", error);

    return NextResponse.json(
      { error: "Dil tercihi kaydedilemedi. Lütfen tekrar dene." },
      { status: 500 },
    );
  }
}