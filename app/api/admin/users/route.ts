import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminAction = "change_subscription" | "change_account_status";

type UpdateRequestBody = {
  action?: unknown;
  userId?: unknown;
  value?: unknown;
};

type UserRecord = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  subscription?: string;
  accountStatus?: string;
  onboardingCompleted?: boolean;
  country?: string;
  language?: string;
  createdAt?: string | null;
};

async function requireAdmin(request: NextRequest): Promise<{
  uid: string;
  email: string | null;
}> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const idToken = authorization.slice("Bearer ".length).trim();

  if (!idToken) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const decodedToken = await adminAuth.verifyIdToken(idToken, true);
  const adminSnapshot = await adminDb.collection("users").doc(decodedToken.uid).get();

  if (!adminSnapshot.exists || adminSnapshot.data()?.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCreatedAt(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

function toUserRecord(
  id: string,
  data: FirebaseFirestore.DocumentData,
): UserRecord {
  return {
    id,
    fullName: readString(data.fullName) || undefined,
    email: readString(data.email) || undefined,
    role: readString(data.role) || undefined,
    subscription: readString(data.subscription) || "free",
    accountStatus: readString(data.accountStatus) || "active",
    onboardingCompleted:
      typeof data.onboardingCompleted === "boolean"
        ? data.onboardingCompleted
        : false,
    country: readString(data.country) || undefined,
    language: readString(data.language) || undefined,
    createdAt: normalizeCreatedAt(data.createdAt),
  };
}

function isAllowedSubscription(value: string): value is "free" | "premium" {
  return value === "free" || value === "premium";
}

function isAllowedAccountStatus(
  value: string,
): value is "active" | "disabled" {
  return value === "active" || value === "disabled";
}

function errorResponse(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.status === 401
            ? "Oturum doğrulanamadı."
            : "Bu işlem için admin yetkisi gerekiyor.",
      },
      { status: error.status },
    );
  }

  console.error("Admin users API error:", error);

  return NextResponse.json(
    {
      success: false,
      error: "Admin işlemi tamamlanamadı.",
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const users = snapshot.docs.map((document) =>
      toUserRecord(document.id, document.data()),
    );

    return NextResponse.json({
      success: true,
      data: {
        users,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json()) as UpdateRequestBody;

    const action = readString(body.action) as AdminAction;
    const userId = readString(body.userId);
    const value = readString(body.value);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı kimliği eksik.",
        },
        { status: 400 },
      );
    }

    const targetReference = adminDb.collection("users").doc(userId);
    const targetSnapshot = await targetReference.get();

    if (!targetSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı bulunamadı.",
        },
        { status: 404 },
      );
    }

    if (action === "change_subscription") {
      if (!isAllowedSubscription(value)) {
        return NextResponse.json(
          {
            success: false,
            error: "Geçersiz abonelik planı.",
          },
          { status: 400 },
        );
      }

      await targetReference.update({
        subscription: value,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByAdminUid: admin.uid,
      });
    } else if (action === "change_account_status") {
      if (!isAllowedAccountStatus(value)) {
        return NextResponse.json(
          {
            success: false,
            error: "Geçersiz hesap durumu.",
          },
          { status: 400 },
        );
      }

      if (userId === admin.uid && value === "disabled") {
        return NextResponse.json(
          {
            success: false,
            error: "Kendi admin hesabını pasifleştiremezsin.",
          },
          { status: 400 },
        );
      }

      const targetRole = readString(targetSnapshot.data()?.role);

      if (targetRole === "admin" && value === "disabled") {
        return NextResponse.json(
          {
            success: false,
            error: "Admin hesabı bu panelden pasifleştirilemez.",
          },
          { status: 400 },
        );
      }

      await targetReference.update({
        accountStatus: value,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByAdminUid: admin.uid,
      });

      if (value === "disabled") {
        await adminAuth.revokeRefreshTokens(userId);
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz admin işlemi.",
        },
        { status: 400 },
      );
    }

    await adminDb.collection("adminAuditLogs").add({
      adminUid: admin.uid,
      adminEmail: admin.email,
      targetUserId: userId,
      action,
      value,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        action,
        value,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}