import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getStripe(): Stripe {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new ApiError(
      500,
      "STRIPE_SECRET_KEY tanımlı değil.",
    );
  }

  return new Stripe(secretKey);
}

function readBearerToken(
  request: NextRequest,
): string {
  const authorization =
    request.headers
      .get("authorization")
      ?.trim() || "";

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  const token = match?.[1]?.trim() || "";

  if (!token) {
    throw new ApiError(
      401,
      "Oturum doğrulanamadı.",
    );
  }

  return token;
}

async function verifyUser(
  request: NextRequest,
) {
  try {
    const decodedToken =
      await adminAuth.verifyIdToken(
        readBearerToken(request),
        true,
      );

    if (
      decodedToken.email_verified !== true
    ) {
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
      "Oturum geçersiz veya süresi dolmuş.",
    );
  }
}

function getApplicationOrigin(
  request: NextRequest,
): string {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);

      if (
        url.protocol !== "https:" &&
        url.hostname !== "localhost"
      ) {
        throw new Error(
          "Production URL HTTPS kullanmalıdır.",
        );
      }

      return url.origin;
    } catch {
      throw new ApiError(
        500,
        "NEXT_PUBLIC_APP_URL geçerli bir URL değil.",
      );
    }
  }

  const requestOrigin =
    request.nextUrl.origin;

  if (
    requestOrigin.startsWith(
      "http://localhost:",
    ) ||
    requestOrigin ===
      "https://alqev.com" ||
    requestOrigin ===
      "https://www.alqev.com"
  ) {
    return requestOrigin;
  }

  throw new ApiError(
    500,
    "Uygulama adresi doğrulanamadı.",
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const decodedToken =
      await verifyUser(request);

    const userReference = adminDb
      .collection("users")
      .doc(decodedToken.uid);

    const userSnapshot =
      await userReference.get();

    if (!userSnapshot.exists) {
      throw new ApiError(
        404,
        "Kullanıcı profili bulunamadı.",
      );
    }

    const userData =
      userSnapshot.data() ?? {};

    const accountStatus =
      typeof userData.accountStatus ===
        "string"
        ? userData.accountStatus.trim()
        : "";

    if (
      accountStatus &&
      accountStatus !== "active"
    ) {
      throw new ApiError(
        403,
        "Hesabın şu anda aktif değil.",
      );
    }

    const stripeCustomerId =
      typeof userData.stripeCustomerId ===
        "string"
        ? userData.stripeCustomerId.trim()
        : "";

    if (!stripeCustomerId) {
      throw new ApiError(
        404,
        "Stripe müşteri kaydı bulunamadı.",
      );
    }

    const stripe = getStripe();

    const customer =
      await stripe.customers.retrieve(
        stripeCustomerId,
      );

    if (
      "deleted" in customer &&
      customer.deleted
    ) {
      throw new ApiError(
        404,
        "Stripe müşteri kaydı silinmiş.",
      );
    }

    const origin =
      getApplicationOrigin(request);

    const session =
      await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/pricing`,
      });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe Portal API hatası:",
      error,
    );

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    if (
      error instanceof
      Stripe.errors.StripeError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message ||
            "Stripe müşteri portalı oluşturulamadı.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Abonelik portalı oluşturulamadı.",
      },
      { status: 500 },
    );
  }
}