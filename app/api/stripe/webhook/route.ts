import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class WebhookError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WebhookError";
  }
}

function getStripe(): Stripe {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new WebhookError(
      500,
      "STRIPE_SECRET_KEY tanımlı değil.",
    );
  }

  return new Stripe(secretKey);
}

function getWebhookSecret(): string {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new WebhookError(
      500,
      "STRIPE_WEBHOOK_SECRET tanımlı değil.",
    );
  }

  return webhookSecret;
}

function getConfiguredPriceId(): string {
  const priceId =
    process.env.STRIPE_PRICE_ID?.trim();

  if (!priceId?.startsWith("price_")) {
    throw new WebhookError(
      500,
      "STRIPE_PRICE_ID geçerli değil.",
    );
  }

  return priceId;
}

function readId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || "";
}

function readSubscriptionIdFromSession(
  session: Stripe.Checkout.Session,
): string {
  if (typeof session.subscription === "string") {
    return session.subscription;
  }

  return session.subscription?.id || "";
}

function readFirebaseUidFromMetadata(
  metadata:
    | Stripe.Metadata
    | null
    | undefined,
): string {
  return metadata?.firebaseUid?.trim() || "";
}

function readUnixTimestamp(
  value: unknown,
): Date | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? new Date(value * 1000)
    : null;
}

function readCurrentPeriodEnd(
  subscription: Stripe.Subscription,
): Date | null {
  const subscriptionRecord =
    subscription as unknown as Record<
      string,
      unknown
    >;

  const directValue =
    subscriptionRecord.current_period_end;

  if (
    typeof directValue === "number"
  ) {
    return readUnixTimestamp(directValue);
  }

  const firstItem =
    subscription.items.data[0] as
      | (Stripe.SubscriptionItem & {
          current_period_end?: number;
        })
      | undefined;

  return readUnixTimestamp(
    firstItem?.current_period_end,
  );
}

function subscriptionContainsPrice(
  subscription: Stripe.Subscription,
  priceId: string,
): boolean {
  return subscription.items.data.some(
    (item) => item.price.id === priceId,
  );
}

function hasPremiumAccess(
  status: Stripe.Subscription.Status,
): boolean {
  return (
    status === "active" ||
    status === "trialing"
  );
}

async function findUserId(input: {
  firebaseUid?: string;
  customerId?: string;
}): Promise<string> {
  const firebaseUid =
    input.firebaseUid?.trim() || "";

  if (firebaseUid) {
    const userSnapshot = await adminDb
      .collection("users")
      .doc(firebaseUid)
      .get();

    if (userSnapshot.exists) {
      return firebaseUid;
    }
  }

  const customerId =
    input.customerId?.trim() || "";

  if (!customerId) {
    return "";
  }

  const usersSnapshot = await adminDb
    .collection("users")
    .where(
      "stripeCustomerId",
      "==",
      customerId,
    )
    .limit(1)
    .get();

  return usersSnapshot.empty
    ? ""
    : usersSnapshot.docs[0].id;
}

async function getCustomerFirebaseUid(
  stripe: Stripe,
  customerId: string,
): Promise<string> {
  if (!customerId) {
    return "";
  }

  try {
    const customer =
      await stripe.customers.retrieve(
        customerId,
      );

    if (
      "deleted" in customer &&
      customer.deleted
    ) {
      return "";
    }

    return readFirebaseUidFromMetadata(
      customer.metadata,
    );
  } catch (error) {
    console.warn(
      "Stripe müşteri metadata bilgisi okunamadı:",
      error,
    );

    return "";
  }
}

async function synchronizeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  fallbackFirebaseUid = "",
): Promise<void> {
  const configuredPriceId =
    getConfiguredPriceId();
  const customerId =
    readId(subscription.customer);

  const metadataUid =
    readFirebaseUidFromMetadata(
      subscription.metadata,
    );

  const customerUid =
    metadataUid || fallbackFirebaseUid
      ? ""
      : await getCustomerFirebaseUid(
          stripe,
          customerId,
        );

  const userId = await findUserId({
    firebaseUid:
      metadataUid ||
      fallbackFirebaseUid ||
      customerUid,
    customerId,
  });

  if (!userId) {
    throw new WebhookError(
      404,
      "Stripe aboneliğine ait ALQEV kullanıcısı bulunamadı.",
    );
  }

  const correctPrice =
    subscriptionContainsPrice(
      subscription,
      configuredPriceId,
    );

  const premium =
    correctPrice &&
    hasPremiumAccess(subscription.status);

  const currentPeriodEnd =
    readCurrentPeriodEnd(subscription);

  await adminDb
    .collection("users")
    .doc(userId)
    .set(
      {
        subscription:
          premium ? "premium" : "free",
        stripeCustomerId:
          customerId || null,
        stripeSubscriptionId:
          subscription.id,
        stripeSubscriptionStatus:
          subscription.status,
        stripePriceId:
          correctPrice
            ? configuredPriceId
            : null,
        stripeCancelAtPeriodEnd:
          subscription.cancel_at_period_end,
        stripeCurrentPeriodEnd:
          currentPeriodEnd,
        stripeLastSyncedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (
    session.mode !== "subscription" ||
    session.payment_status === "unpaid"
  ) {
    return;
  }

  const subscriptionId =
    readSubscriptionIdFromSession(session);

  if (!subscriptionId) {
    throw new WebhookError(
      400,
      "Checkout Session içinde abonelik kimliği bulunamadı.",
    );
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId,
      {
        expand: [
          "items.data.price.product",
        ],
      },
    );

  const firebaseUid =
    readFirebaseUidFromMetadata(
      session.metadata,
    ) ||
    session.client_reference_id ||
    "";

  await synchronizeSubscription(
    stripe,
    subscription,
    firebaseUid,
  );
}

function extractInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string {
  const invoiceRecord =
    invoice as unknown as Record<
      string,
      unknown
    >;

  const legacySubscription =
    invoiceRecord.subscription;

  if (
    typeof legacySubscription === "string"
  ) {
    return legacySubscription;
  }

  if (
    legacySubscription &&
    typeof legacySubscription === "object" &&
    "id" in legacySubscription &&
    typeof (
      legacySubscription as {
        id?: unknown;
      }
    ).id === "string"
  ) {
    return (
      legacySubscription as {
        id: string;
      }
    ).id;
  }

  const parent =
    invoiceRecord.parent;

  if (
    !parent ||
    typeof parent !== "object"
  ) {
    return "";
  }

  const subscriptionDetails =
    (
      parent as {
        subscription_details?: unknown;
      }
    ).subscription_details;

  if (
    !subscriptionDetails ||
    typeof subscriptionDetails !== "object"
  ) {
    return "";
  }

  const subscription =
    (
      subscriptionDetails as {
        subscription?: unknown;
      }
    ).subscription;

  if (typeof subscription === "string") {
    return subscription;
  }

  if (
    subscription &&
    typeof subscription === "object" &&
    "id" in subscription &&
    typeof (
      subscription as {
        id?: unknown;
      }
    ).id === "string"
  ) {
    return (
      subscription as {
        id: string;
      }
    ).id;
  }

  return "";
}

async function synchronizeFromInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    extractInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId,
    );

  await synchronizeSubscription(
    stripe,
    subscription,
  );
}

async function reserveWebhookEvent(
  event: Stripe.Event,
): Promise<boolean> {
  const eventReference = adminDb
    .collection("stripeWebhookEvents")
    .doc(event.id);

  try {
    await eventReference.create({
      type: event.type,
      stripeCreatedAt:
        new Date(event.created * 1000),
      status: "processing",
      receivedAt:
        FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    const existingSnapshot =
      await eventReference.get();

    if (existingSnapshot.exists) {
      return false;
    }

    throw error;
  }
}

async function markWebhookProcessed(
  event: Stripe.Event,
): Promise<void> {
  await adminDb
    .collection("stripeWebhookEvents")
    .doc(event.id)
    .set(
      {
        status: "processed",
        processedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function releaseWebhookReservation(
  event: Stripe.Event,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  await adminDb
    .collection("stripeWebhookEvents")
    .doc(event.id)
    .delete()
    .catch((deleteError) => {
      console.error(
        "Başarısız webhook rezervasyonu silinemedi:",
        deleteError,
        message,
      );
    });
}

export async function POST(
  request: NextRequest,
) {
  let event: Stripe.Event | null = null;

  try {
    const signature =
      request.headers.get(
        "stripe-signature",
      );

    if (!signature) {
      throw new WebhookError(
        400,
        "Stripe-Signature başlığı bulunamadı.",
      );
    }

    const rawBody =
      await request.text();
    const stripe = getStripe();

    try {
      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          getWebhookSecret(),
        );
    } catch (error) {
      console.error(
        "Stripe webhook imza doğrulaması başarısız:",
        error,
      );

      throw new WebhookError(
        400,
        "Webhook imzası doğrulanamadı.",
      );
    }

    const reserved =
      await reserveWebhookEvent(event);

    if (!reserved) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          stripe,
          event.data.object as
            Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await synchronizeSubscription(
          stripe,
          event.data.object as
            Stripe.Subscription,
        );
        break;

      case "invoice.paid":
      case "invoice.payment_failed":
        await synchronizeFromInvoice(
          stripe,
          event.data.object as
            Stripe.Invoice,
        );
        break;

      default:
        break;
    }

    await markWebhookProcessed(event);

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    if (event) {
      await releaseWebhookReservation(
        event,
        error,
      );
    }

    console.error(
      "Stripe Webhook API hatası:",
      error,
    );

    if (error instanceof WebhookError) {
      return NextResponse.json(
        {
          received: false,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe webhook işlenemedi.",
      },
      { status: 500 },
    );
  }
}