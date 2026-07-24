"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

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
  createdAt?: {
    toDate?: () => Date;
  };
};

function formatDate(value: UserRecord["createdAt"]) {
  if (!value?.toDate) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(value.toDate());
  } catch {
    return "—";
  }
}

export default function AdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const adminDocument = await getDoc(doc(db, "users", user.uid));

        if (!adminDocument.exists()) {
          setErrorMessage("Kullanıcı profili bulunamadı.");
          setIsLoading(false);
          return;
        }

        const adminData = adminDocument.data();

        if (adminData.role !== "admin") {
          setErrorMessage(
            "Bu sayfaya erişim yetkin yok. Hesabının role alanı admin olmalıdır."
          );
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        const usersReference = collection(db, "users");
        const usersQuery = query(usersReference, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(usersQuery);

        const loadedUsers: UserRecord[] = snapshot.docs.map((userDocument) => ({
          id: userDocument.id,
          ...(userDocument.data() as Omit<UserRecord, "id">),
        }));

        setUsers(loadedUsers);
      } catch (error) {
        console.error("Admin paneli yüklenemedi:", error);
        setErrorMessage(
          "Admin verileri yüklenemedi. Firestore yetkilerini kontrol et."
        );
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(normalizedSearch) ||
        user.email?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search, users]);

  const premiumUserCount = users.filter(
    (user) => user.subscription === "premium"
  ).length;

  const activeUserCount = users.filter(
    (user) => user.accountStatus !== "disabled"
  ).length;

  const completedOnboardingCount = users.filter(
    (user) => user.onboardingCompleted === true
  ).length;

  async function changeSubscription(
    userId: string,
    subscription: "free" | "premium"
  ) {
    try {
      setWorkingUserId(userId);
      setErrorMessage("");

      await updateDoc(doc(db, "users", userId), {
        subscription,
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, subscription } : user
        )
      );
    } catch (error) {
      console.error("Abonelik değiştirilemedi:", error);
      setErrorMessage("Kullanıcının abonelik planı değiştirilemedi.");
    } finally {
      setWorkingUserId(null);
    }
  }

  async function changeAccountStatus(
    userId: string,
    accountStatus: "active" | "disabled"
  ) {
    try {
      setWorkingUserId(userId);
      setErrorMessage("");

      await updateDoc(doc(db, "users", userId), {
        accountStatus,
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, accountStatus } : user
        )
      );
    } catch (error) {
      console.error("Hesap durumu değiştirilemedi:", error);
      setErrorMessage("Kullanıcının hesap durumu değiştirilemedi.");
    } finally {
      setWorkingUserId(null);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          <p className="mt-4 text-sm text-zinc-400">
            Admin paneli hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-zinc-950 p-8 text-center">
          <div className="text-4xl">🔒</div>

          <h1 className="mt-4 text-2xl font-semibold">
            Admin erişimi bulunamadı
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {errorMessage || "Bu sayfaya erişim yetkin yok."}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Dashboard’a dön
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-violet-300">
              ALQEV
            </p>

            <h1 className="mt-1 text-xl font-semibold">Admin Paneli</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Kullanıcı paneli
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8">
          <p className="text-sm text-zinc-400">
            Giriş yapan yönetici:{" "}
            <span className="text-zinc-200">
              {currentUser?.email || "Bilinmiyor"}
            </span>
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Toplam kullanıcı" value={users.length} />
            <StatCard label="Premium kullanıcı" value={premiumUserCount} />
            <StatCard label="Aktif hesap" value={activeUserCount} />
            <StatCard
              label="Onboarding tamamlandı"
              value={completedOnboardingCount}
            />
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Kullanıcı yönetimi</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Kullanıcı planlarını ve hesap durumlarını yönet.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad veya e-posta ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/60 sm:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-4">Kullanıcı</th>
                  <th className="px-5 py-4">Kayıt tarihi</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4">İşlemler</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => {
                  const isWorking = workingUserId === user.id;
                  const isPremium = user.subscription === "premium";
                  const isDisabled = user.accountStatus === "disabled";

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">
                          {user.fullName || "İsimsiz kullanıcı"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {user.email || "E-posta bulunamadı"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-zinc-400">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isPremium
                              ? "bg-violet-500/15 text-violet-200"
                              : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          {isPremium ? "Premium" : "Free"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isDisabled
                              ? "bg-red-500/15 text-red-200"
                              : "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {isDisabled ? "Pasif" : "Aktif"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex min-w-max gap-2">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() =>
                              changeSubscription(
                                user.id,
                                isPremium ? "free" : "premium"
                              )
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isPremium ? "Free yap" : "Premium yap"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              isWorking || user.id === currentUser?.uid
                            }
                            onClick={() =>
                              changeAccountStatus(
                                user.id,
                                isDisabled ? "active" : "disabled"
                              )
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isDisabled ? "Aktif yap" : "Pasif yap"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-zinc-500"
                    >
                      Aramana uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </article>
  );
}