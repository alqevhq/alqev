import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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

type RegistrationDay = {
  date: string;
  label: string;
  count: number;
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
  const adminSnapshot = await adminDb
    .collection("users")
    .doc(decodedToken.uid)
    .get();

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

function getBerlinDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getBerlinDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getBerlinStartOfToday(): Date {
  const now = new Date();
  const key = getBerlinDateKey(now);
  const [year, month, day] = key.split("-").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const berlinHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(utcGuess),
  );

  return new Date(utcGuess.getTime() - berlinHour * 60 * 60 * 1000);
}

function createLast30DaysSeries(
  registrationDates: Date[],
): RegistrationDay[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const counts = new Map<string, number>();

  for (const date of registrationDates) {
    const key = formatter.format(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: RegistrationDay[] = [];
  const start = getBerlinStartOfToday();

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() - index);

    const key = getBerlinDateKey(date);

    result.push({
      date: key,
      label: getBerlinDayLabel(date),
      count: counts.get(key) ?? 0,
    });
  }

  return result;
}

async function getTotalProcessCount(
  userDocuments: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<number> {
  try {
    const aggregate = await adminDb.collectionGroup("processes").count().get();
    return aggregate.data().count;
  } catch (error) {
    console.warn(
      "Collection-group process count failed; using per-user fallback.",
      error,
    );

    const counts = await Promise.all(
      userDocuments.map(async (userDocument) => {
        const aggregate = await userDocument.ref
          .collection("processes")
          .count()
          .get();

        return aggregate.data().count;
      }),
    );

    return counts.reduce((total, count) => total + count, 0);
  }
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

    const usersReference = adminDb.collection("users");
    const startOfToday = getBerlinStartOfToday();
    const startOfLast30Days = new Date(startOfToday);
    startOfLast30Days.setUTCDate(startOfLast30Days.getUTCDate() - 29);

    const [
      listSnapshot,
      allUsersSnapshot,
      totalUsersAggregate,
      premiumUsersAggregate,
      disabledUsersAggregate,
      todayUsersAggregate,
      last30DaysSnapshot,
    ] = await Promise.all([
      usersReference.orderBy("createdAt", "desc").limit(500).get(),
      usersReference.get(),
      usersReference.count().get(),
      usersReference.where("subscription", "==", "premium").count().get(),
      usersReference.where("accountStatus", "==", "disabled").count().get(),
      usersReference
        .where("createdAt", ">=", Timestamp.fromDate(startOfToday))
        .count()
        .get(),
      usersReference
        .where("createdAt", ">=", Timestamp.fromDate(startOfLast30Days))
        .get(),
    ]);

    const users = listSnapshot.docs.map((document) =>
      toUserRecord(document.id, document.data()),
    );

    const totalUsers = totalUsersAggregate.data().count;
    const premiumUsers = premiumUsersAggregate.data().count;
    const disabledUsers = disabledUsersAggregate.data().count;
    const activeUsers = Math.max(0, totalUsers - disabledUsers);
    const registeredToday = todayUsersAggregate.data().count;
    const totalProcesses = await getTotalProcessCount(allUsersSnapshot.docs);

    const registrationDates = last30DaysSnapshot.docs.flatMap((document) => {
      const value = document.data().createdAt;

      if (
        value &&
        typeof value === "object" &&
        "toDate" in value &&
        typeof (value as { toDate?: unknown }).toDate === "function"
      ) {
        return [(value as { toDate: () => Date }).toDate()];
      }

      return [];
    });

    const registrationsLast30Days = registrationDates.length;
    const last30Days = createLast30DaysSeries(registrationDates);

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          totalUsers,
          activeUsers,
          premiumUsers,
          totalProcesses,
          registeredToday,
          registrationsLast30Days,
          last30Days,
        },
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