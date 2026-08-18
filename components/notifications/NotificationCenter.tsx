"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeNotifications,
  type AdvisorNotification,
  type NotificationProcess,
} from "@/lib/ai/notification-advisor";
import {
  getLocalizedDocumentTitle,
  getLocalizedProcessTitle,
} from "@/lib/process-templates";

type NotificationLanguage = "tr" | "de" | "en" | "ru" | "ar" | "fa";

type NotificationCenterProps = {
  processes: NotificationProcess[];
  language: NotificationLanguage;
  userId: string;
};

const uiCopy: Record<
  NotificationLanguage,
  {
    notifications: string;
    noNotifications: string;
    noNotificationsText: string;
    markAllRead: string;
    unread: string;
    close: string;
  }
> = {
  tr: {
    notifications: "Bildirimler",
    noNotifications: "Yeni bildirim yok",
    noNotificationsText: "Şu anda dikkat etmen gereken yeni bir durum görünmüyor.",
    markAllRead: "Tümünü okundu işaretle",
    unread: "okunmamış",
    close: "Kapat",
  },
  de: {
    notifications: "Mitteilungen",
    noNotifications: "Keine neuen Mitteilungen",
    noNotificationsText: "Derzeit gibt es nichts Neues, das deine Aufmerksamkeit erfordert.",
    markAllRead: "Alle als gelesen markieren",
    unread: "ungelesen",
    close: "Schließen",
  },
  en: {
    notifications: "Notifications",
    noNotifications: "No new notifications",
    noNotificationsText: "There is nothing new requiring your attention right now.",
    markAllRead: "Mark all as read",
    unread: "unread",
    close: "Close",
  },
  ru: {
    notifications: "Уведомления",
    noNotifications: "Новых уведомлений нет",
    noNotificationsText: "Сейчас нет новых событий, требующих вашего внимания.",
    markAllRead: "Отметить все как прочитанные",
    unread: "непрочитано",
    close: "Закрыть",
  },
  ar: {
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات جديدة",
    noNotificationsText: "لا يوجد حاليًا ما يتطلب انتباهك.",
    markAllRead: "تحديد الكل كمقروء",
    unread: "غير مقروء",
    close: "إغلاق",
  },
  fa: {
    notifications: "اعلان‌ها",
    noNotifications: "اعلان جدیدی نیست",
    noNotificationsText: "در حال حاضر مورد جدیدی که نیاز به توجه شما داشته باشد وجود ندارد.",
    markAllRead: "علامت‌گذاری همه به‌عنوان خوانده‌شده",
    unread: "خوانده‌نشده",
    close: "بستن",
  },
};

function storageKey(userId: string): string {
  return `alqev:notifications:read:${userId}`;
}

function readStoredIds(userId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify(Array.from(new Set(ids)).slice(-500)),
    );
  } catch {
    // Bildirim merkezi localStorage hatası yüzünden dashboard'u bozmamalı.
  }
}

function severityClass(notification: AdvisorNotification): string {
  switch (notification.severity) {
    case "critical":
      return "border-rose-400/20 bg-rose-400/[0.06]";
    case "warning":
      return "border-amber-400/20 bg-amber-400/[0.06]";
    case "success":
      return "border-emerald-400/20 bg-emerald-400/[0.06]";
    default:
      return "border-indigo-400/20 bg-indigo-400/[0.06]";
  }
}

function severityDot(notification: AdvisorNotification): string {
  switch (notification.severity) {
    case "critical":
      return "bg-rose-400";
    case "warning":
      return "bg-amber-400";
    case "success":
      return "bg-emerald-400";
    default:
      return "bg-indigo-400";
  }
}

export default function NotificationCenter({
  processes,
  language,
  userId,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const copy = uiCopy[language];

  useEffect(() => {
    setReadIds(readStoredIds(userId));
  }, [userId]);

  const localizedProcesses = useMemo(
    () =>
      processes.map((process) => {
        const localizedProcessTitle =
          getLocalizedProcessTitle(
            {
              templateKey: process.templateKey,
              title: process.title || "",
            },
            language,
          ) ||
          process.title ||
          "";

        const localizedDocuments = (
          process.requiredDocuments ??
          process.documents ??
          []
        ).map((document) => ({
          ...document,
          title:
            getLocalizedDocumentTitle(
              {
                templateKey: process.templateKey,
                processTitle: process.title || "",
                documentKey: document.key,
                documentTitle:
                  document.title ||
                  document.fileName ||
                  "",
              },
              language,
            ) ||
            document.title ||
            document.fileName ||
            "",
        }));

        return {
          ...process,
          title: localizedProcessTitle,
          requiredDocuments: localizedDocuments,
          documents: localizedDocuments,
        };
      }),
    [language, processes],
  );

  const result = useMemo(
    () =>
      analyzeNotifications(localizedProcesses, {
        language,
        includeSuccess: true,
        includeInfo: true,
        maxNotifications: 30,
      }),
    [language, localizedProcesses],
  );

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = result.notifications.filter(
    (notification) => !readIdSet.has(notification.id),
  ).length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function markRead(notificationId: string) {
    setReadIds((current) => {
      if (current.includes(notificationId)) {
        return current;
      }

      const next = [...current, notificationId];
      writeStoredIds(userId, next);
      return next;
    });
  }

  function markAllRead() {
    const next = Array.from(
      new Set([
        ...readIds,
        ...result.notifications.map((notification) => notification.id),
      ]),
    );

    setReadIds(next);
    writeStoredIds(userId, next);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={copy.notifications}
        aria-expanded={isOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-indigo-400/40 hover:text-white"
      >
        <span aria-hidden="true" className="text-lg">
          ♢
        </span>

        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={copy.notifications}
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5.25rem)] z-50 max-h-[calc(100dvh-env(safe-area-inset-top)-6.25rem)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:max-h-none sm:w-[min(92vw,420px)]"
        >
          <div className="flex min-w-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:items-center sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <p className="font-semibold text-white">{copy.notifications}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount} {copy.unread}
              </p>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="max-w-[48%] shrink-0 text-right text-xs font-semibold leading-4 text-indigo-300 transition hover:text-indigo-200"
              >
                {copy.markAllRead}
              </button>
            ) : null}
          </div>

          <div className="max-h-[calc(100dvh-env(safe-area-inset-top)-10.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain p-2.5 sm:max-h-[70vh] sm:p-3">
            {result.notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-semibold text-slate-200">
                  {copy.noNotifications}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {copy.noNotificationsText}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.notifications.map((notification) => {
                  const isRead = readIdSet.has(notification.id);

                  const content = (
                    <div
                      className={[
                        "w-full min-w-0 overflow-hidden rounded-xl border p-3.5 transition hover:bg-white/[0.04] sm:p-4",
                        severityClass(notification),
                        isRead ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDot(notification)}`}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-5 text-slate-100">
                            {notification.title}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                            {notification.message}
                          </p>

                          {notification.action.href ? (
                            <p className="mt-3 text-xs font-semibold text-indigo-300">
                              {notification.action.label} →
                            </p>
                          ) : null}
                        </div>

                        {!isRead ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400"
                            aria-label={copy.unread}
                          />
                        ) : null}
                      </div>
                    </div>
                  );

                  return notification.action.href ? (
                    <Link
                      key={notification.id}
                      href={notification.action.href}
                      onClick={() => {
                        markRead(notification.id);
                        setIsOpen(false);
                      }}
                      className="block min-w-0"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="block w-full text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}