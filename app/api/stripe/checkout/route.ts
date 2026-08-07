import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutRequestBody = {
  language?: unknown;
};

type SupportedLanguage =
  | "tr"
  | "de"
  | "en"
  | "ru"
  | "ar"
  | "fa";

const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>([
  "tr",
  "de",
  "en",
  "ru",
  "ar",
  "fa",
]);

const BLOCKING_SUBSCRIPTION_STATUSES =
  new Set<Stripe.Subscription.Status>([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ]);

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

function getPriceId(): string {
  const priceId =
    process.env.STRIPE_PRICE_ID?.trim();

  if (!priceId) {
    throw new ApiError(
      500,
      "STRIPE_PRICE_ID tanımlı değil.",
    );
  }

  if (!priceId.startsWith("price_")) {
    throw new ApiError(
      500,
      "STRIPE_PRICE_ID geçerli görünmüyor.",
    );
  }

  return priceId;
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

async function readRequestBody(
  request: NextRequest,
): Promise<CheckoutRequestBody> {
  try {
    return (await request.json()) as CheckoutRequestBody;
  } catch {
    return {};
  }
}

function normalizeLanguage(
  value: unknown,
): SupportedLanguage {
  return typeof value === "string" &&
    SUPPORTED_LANGUAGES.has(
      value as SupportedLanguage,
    )
    ? (value as SupportedLanguage)
    : "tr";
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
    "Uygulama adresi doğrulanamadı. NEXT_PUBLIC_APP_URL tanımlanmalı.",
  );
}

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  input: {
    uid: string;
    email: string;
    fullName: string;
    existingCustomerId: string;
  },
): Promise<string> {
  if (input.existingCustomerId) {
    try {
      const existingCustomer =
        await stripe.customers.retrieve(
          input.existingCustomerId,
        );

      if (
        !("deleted" in existingCustomer) ||
        existingCustomer.deleted !== true
      ) {
        return input.existingCustomerId;
      }
    } catch (error) {
      console.warn(
        "Kayıtlı Stripe müşterisi bulunamadı; yeniden oluşturulacak:",
        error,
      );
    }
  }

  const customer =
    await stripe.customers.create({
      email: input.email || undefined,
      name: input.fullName || undefined,
      metadata: {
        firebaseUid: input.uid,
        source: "alqev",
      },
    });

  return customer.id;
}

function subscriptionUsesPrice(
  subscription: Stripe.Subscription,
  priceId: string,
): boolean {
  return subscription.items.data.some(
    (item) => item.price.id === priceId,
  );
}

async function findBlockingSubscription(
  stripe: Stripe,
  customerId: string,
  priceId: string,
): Promise<Stripe.Subscription | null> {
  const subscriptions =
    await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

  return (
    subscriptions.data.find(
      (subscription) =>
        BLOCKING_SUBSCRIPTION_STATUSES.has(
          subscription.status,
        ) &&
        subscriptionUsesPrice(
          subscription,
          priceId,
        ),
    ) ?? null
  );
}

async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const decodedToken =
      await verifyUser(request);
    const body =
      await readRequestBody(request);
    const language =
      normalizeLanguage(body.language);

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

    const email =
      decodedToken.email?.trim() ||
      (typeof userData.email === "string"
        ? userData.email.trim()
        : "");

    if (!email) {
      throw new ApiError(
        400,
        "Stripe Checkout için e-posta adresi bulunamadı.",
      );
    }

    const fullName =
      typeof userData.fullName === "string"
        ? userData.fullName.trim()
        : "";

    const existingCustomerId =
      typeof userData.stripeCustomerId ===
        "string"
        ? userData.stripeCustomerId.trim()
        : "";

    const stripe = getStripe();
    const stripeCustomerId =
      await getOrCreateStripeCustomer(
        stripe,
        {
          uid: decodedToken.uid,
          email,
          fullName,
          existingCustomerId,
        },
      );

    if (
      stripeCustomerId !==
      existingCustomerId
    ) {
      await userReference.set(
        {
          stripeCustomerId,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const origin =
      getApplicationOrigin(request);
    const priceId =
      getPriceId();

    const existingSubscription =
      await findBlockingSubscription(
        stripe,
        stripeCustomerId,
        priceId,
      );

    if (existingSubscription) {
      await userReference.set(
        {
          stripeCustomerId,
          stripeSubscriptionId:
            existingSubscription.id,
          stripeSubscriptionStatus:
            existingSubscription.status,
          stripeCancelAtPeriodEnd:
            existingSubscription
              .cancel_at_period_end,
          stripePriceId: priceId,
          subscription:
            existingSubscription.status ===
              "active" ||
            existingSubscription.status ===
              "trialing"
              ? "premium"
              : (
                    typeof userData.subscription ===
                    "string"
                      ? userData.subscription
                      : "free"
                  ),
          stripeLastSyncedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const portalSession =
        await createPortalSession(
          stripe,
          stripeCustomerId,
          `${origin}/pricing`,
        );

      return NextResponse.json({
        success: true,
        url: portalSession.url,
        existingSubscription: true,
        subscriptionStatus:
          existingSubscription.status,
      });
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        client_reference_id:
          decodedToken.uid,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        billing_address_collection:
          "auto",
        locale:
          language === "tr"
            ? "tr"
            : language,
        success_url:
          `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          `${origin}/pricing?checkout=cancelled`,
        metadata: {
          firebaseUid:
            decodedToken.uid,
          plan: "premium",
          source: "pricing-page",
        },
        subscription_data: {
          metadata: {
            firebaseUid:
              decodedToken.uid,
            plan: "premium",
            source: "alqev",
          },
        },
      });

    if (!session.url) {
      throw new ApiError(
        502,
        "Stripe ödeme adresi oluşturulamadı.",
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      existingSubscription: false,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout API hatası:",
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
            "Stripe ödeme oturumu oluşturulamadı.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Ödeme işlemi başlatılamadı.",
      },
      { status: 500 },
    );
  }
}