"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import ProcessAiPanel from "@/components/process/ProcessAiPanel";

type OcrFieldValue = string | number | boolean | null;

type OcrResult = {
  rawText: string;
  documentType: string;
  extracted: Record<string, OcrFieldValue>;
  analyzedAt: string;
};

type RequiredDocument = {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  storagePath?: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: Timestamp | null;
  ocr?: OcrResult | null;
  ocrError?: string;
};

type Process = {
  id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  status: string;
  progress: number;
  deadline: string | null;
  notes: string;
  requiredDocuments: RequiredDocument[];
  completedDocumentCount: number;
  totalDocumentCount: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

type UploadState = {
  documentKey: string;
  progress: number;
};

type OcrState = {
  documentKey: string;
  mode: "analyzing" | "saving";
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function sanitizeFileName(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  const extension =
    extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : "";
  const baseName =
    extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName;

  const safeBaseName =
    baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "document";

  return `${safeBaseName}${extension}`;
}

function calculateProcessStats(documents: RequiredDocument[]) {
  const completedDocumentCount = documents.filter(
    (item) => item.status === "uploaded" || item.status === "approved",
  ).length;

  const totalDocumentCount = documents.length;
  const progress =
    totalDocumentCount > 0
      ? Math.round((completedDocumentCount / totalDocumentCount) * 100)
      : 0;

  return {
    completedDocumentCount,
    totalDocumentCount,
    progress,
  };
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Aktif";

    case "completed":
      return "Tamamlandı";

    case "paused":
      return "Beklemede";

    case "cancelled":
      return "İptal edildi";

    default:
      return status || "Belirtilmedi";
  }
}

function getDocumentStatusLabel(status?: string) {
  switch (status) {
    case "uploaded":
      return "Yüklendi";

    case "approved":
      return "Onaylandı";

    case "rejected":
      return "Reddedildi";

    case "missing":
    default:
      return "Eksik";
  }
}

function formatDate(value?: Timestamp | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value.toDate());
}

function formatDeadline(value: string | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getOcrFieldLabel(key: string) {
  const labels: Record<string, string> = {
    surname: "Soyadı",
    givenNames: "Adı / Adları",
    passportNumber: "Pasaport numarası",
    nationality: "Uyruğu",
    birthDate: "Doğum tarihi",
    expiryDate: "Geçerlilik tarihi",
    issueDate: "Düzenlenme tarihi",
    issuingCountry: "Düzenleyen ülke",
    sex: "Cinsiyet",
  };

  return (
    labels[key] ||
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (character) => character.toLocaleUpperCase("tr-TR"))
  );
}

function normalizeOcrResponse(value: unknown): Omit<OcrResult, "analyzedAt"> {
  if (!value || typeof value !== "object") {
    throw new Error("OCR servisi geçersiz bir yanıt döndürdü.");
  }

  const response = value as Record<string, unknown>;
  const rawText = typeof response.rawText === "string" ? response.rawText : "";
  const documentType =
    typeof response.documentType === "string" && response.documentType.trim()
      ? response.documentType.trim()
      : "Belge";

  const extractedSource =
    response.extracted && typeof response.extracted === "object"
      ? (response.extracted as Record<string, unknown>)
      : {};

  const extracted = Object.fromEntries(
    Object.entries(extractedSource)
      .filter(([, fieldValue]) =>
        ["string", "number", "boolean"].includes(typeof fieldValue),
      )
      .map(([key, fieldValue]) => [key, fieldValue as OcrFieldValue]),
  );

  return { rawText, documentType, extracted };
}

export default function ProcessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const processId = typeof params.id === "string" ? params.id : params.id?.[0];

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [process, setProcess] = useState<Process | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [ocrState, setOcrState] = useState<OcrState | null>(null);
  const [deletingDocumentKey, setDeletingDocumentKey] = useState<string | null>(
    null,
  );
  const [renamingDocumentKey, setRenamingDocumentKey] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [previewDocument, setPreviewDocument] =
    useState<RequiredDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "missing" | "uploaded" | "approved"
  >("all");
  const [sortMode, setSortMode] = useState<
    "default" | "name" | "status" | "date"
  >("default");
  const [selectedDocumentKeys, setSelectedDocumentKeys] = useState<string[]>(
    [],
  );
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [draggedDocumentKey, setDraggedDocumentKey] = useState<string | null>(
    null,
  );
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const processRef = useRef<Process | null>(null);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUser(null);
          setErrorMessage("Bu sayfayı görmek için giriş yapmalısın.");
          setIsLoading(false);
        }

        router.replace("/login");
        return;
      }

      if (isMounted) {
        setCurrentUser(user);
      }

      if (!processId) {
        if (isMounted) {
          setErrorMessage("Geçerli bir süreç kimliği bulunamadı.");
          setIsLoading(false);
        }

        return;
      }

      try {
        const processReference = doc(
          db,
          "users",
          user.uid,
          "processes",
          processId,
        );

        const snapshot = await getDoc(processReference);

        if (!isMounted) {
          return;
        }

        if (!snapshot.exists()) {
          setErrorMessage("Bu süreç bulunamadı.");
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        const requiredDocuments = Array.isArray(data.requiredDocuments)
          ? (data.requiredDocuments as RequiredDocument[])
          : [];

        const completedDocumentCount =
          typeof data.completedDocumentCount === "number"
            ? data.completedDocumentCount
            : requiredDocuments.filter(
                (item) =>
                  item.status === "uploaded" || item.status === "approved",
              ).length;

        const totalDocumentCount =
          typeof data.totalDocumentCount === "number"
            ? data.totalDocumentCount
            : requiredDocuments.length;

        const calculatedProgress =
          totalDocumentCount > 0
            ? Math.round((completedDocumentCount / totalDocumentCount) * 100)
            : 0;

        const loadedProcess: Process = {
          id: snapshot.id,
          title:
            typeof data.title === "string" ? data.title : "Başlıksız Süreç",
          description:
            typeof data.description === "string" ? data.description : "",
          category: typeof data.category === "string" ? data.category : "",
          country:
            typeof data.country === "string" ? data.country : "Belirtilmedi",
          status: typeof data.status === "string" ? data.status : "active",
          progress:
            typeof data.progress === "number"
              ? data.progress
              : calculatedProgress,
          deadline: typeof data.deadline === "string" ? data.deadline : null,
          notes: typeof data.notes === "string" ? data.notes : "",
          requiredDocuments,
          completedDocumentCount,
          totalDocumentCount,
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt : null,
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt : null,
        };

        processRef.current = loadedProcess;
        setProcess(loadedProcess);
      } catch (error) {
        console.error("Süreç detayı alınamadı:", error);

        if (isMounted) {
          setErrorMessage("Süreç bilgileri yüklenirken bir hata oluştu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [processId, router]);

  async function analyzeDocumentWithOcr(
    documentKey: string,
    fileUrl: string,
    fileName: string,
    contentType: string,
    quiet = false,
  ) {
    const activeProcess = processRef.current;
    if (!activeProcess || !currentUser || !processId) return false;

    if (!quiet) {
      setSuccessMessage("");
      setUploadError("");
    }

    setOcrState({ documentKey, mode: "analyzing" });

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, fileName, contentType }),
      });

      const payload = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Belge AI tarafından analiz edilemedi.";
        throw new Error(message);
      }

      const normalized = normalizeOcrResponse(payload);
      const ocr: OcrResult = {
        ...normalized,
        analyzedAt: new Date().toISOString(),
      };

      setOcrState({ documentKey, mode: "saving" });

      const latestProcess = processRef.current;
      if (!latestProcess) return false;

      const updatedDocuments = latestProcess.requiredDocuments.map((item) =>
        item.key === documentKey
          ? { ...item, ocr, ocrError: "" }
          : item,
      );

      await persistDocuments(updatedDocuments);

      if (!quiet) {
        setSuccessMessage(`“${fileName}” AI tarafından analiz edildi.`);
      }

      return true;
    } catch (error) {
      console.error("OCR analizi tamamlanamadı:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Belge AI tarafından analiz edilemedi.";

      const latestProcess = processRef.current;
      if (latestProcess) {
        const updatedDocuments = latestProcess.requiredDocuments.map((item) =>
          item.key === documentKey
            ? { ...item, ocrError: message }
            : item,
        );

        try {
          await persistDocuments(updatedDocuments);
        } catch (persistError) {
          console.error("OCR hatası Firestore'a kaydedilemedi:", persistError);
        }
      }

      if (!quiet) setUploadError(message);
      return false;
    } finally {
      setOcrState(null);
    }
  }

  async function uploadFile(file: File, documentKey: string, quiet = false) {
    if (!quiet) {
      setSuccessMessage("");
      setUploadError("");
    }

    const activeProcess = processRef.current;
    if (!currentUser || !activeProcess || !processId) return false;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError(
        `“${file.name}” desteklenmiyor. Yalnızca PDF, JPG, PNG veya WEBP yükleyebilirsin.`,
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`“${file.name}” 10 MB sınırını aşıyor.`);
      return false;
    }

    const selectedDocument = activeProcess.requiredDocuments.find(
      (item) => item.key === documentKey,
    );
    if (!selectedDocument) return false;

    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `users/${currentUser.uid}/processes/${processId}/documents/${Date.now()}-${safeFileName}`;
    const storageReference = ref(storage, storagePath);
    const previousStoragePath = selectedDocument.storagePath;

    setUploadState({ documentKey, progress: 0 });

    try {
      const uploadTask = uploadBytesResumable(storageReference, file, {
        contentType: file.type,
        customMetadata: { processId, documentKey, ownerId: currentUser.uid },
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              snapshot.totalBytes > 0
                ? Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  )
                : 0;
            setUploadState({ documentKey, progress });
          },
          reject,
          resolve,
        );
      });

      const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      const uploadedAt = Timestamp.now();
      const latestDocuments = activeProcess.requiredDocuments.map((item) =>
        item.key === documentKey
          ? {
              ...item,
              status: "uploaded",
              fileName: file.name,
              fileUrl,
              storagePath,
              fileSize: file.size,
              contentType: file.type,
              uploadedAt,
            }
          : item,
      );

      await persistDocuments(latestDocuments);

      await analyzeDocumentWithOcr(
        documentKey,
        fileUrl,
        file.name,
        file.type,
        quiet,
      );

      if (previousStoragePath && previousStoragePath !== storagePath) {
        try {
          await deleteObject(ref(storage, previousStoragePath));
        } catch (error) {
          console.warn("Eski dosya silinemedi:", error);
        }
      }

      if (!quiet) setSuccessMessage(`“${file.name}” başarıyla yüklendi.`);
      return true;
    } catch (error) {
      console.error("Belge yüklenemedi:", error);
      setUploadError(`“${file.name}” yüklenemedi.`);
      return false;
    } finally {
      setUploadState(null);
      setDraggedDocumentKey(null);
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    documentKey: string,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFile(file, documentKey);
  }

  async function handleDrop(
    event: DragEvent<HTMLElement>,
    documentKey: string,
  ) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && !uploadState) await uploadFile(file, documentKey);
  }

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !process) return;

    const targets = process.requiredDocuments.filter(
      (item) => item.status !== "uploaded" && item.status !== "approved",
    );
    if (!targets.length) {
      setUploadError("Yüklenecek eksik belge bulunmuyor.");
      return;
    }

    const queue = files.slice(0, targets.length);
    setBulkProgress({ current: 0, total: queue.length });
    let successCount = 0;
    for (let index = 0; index < queue.length; index += 1) {
      setBulkProgress({ current: index + 1, total: queue.length });
      const ok = await uploadFile(queue[index], targets[index].key, true);
      if (ok) successCount += 1;
    }
    setBulkProgress(null);
    setSuccessMessage(`${successCount} belge başarıyla yüklendi.`);
  }

  async function persistDocuments(updatedDocuments: RequiredDocument[]) {
    if (!currentUser || !processId) {
      throw new Error("Kullanıcı veya süreç bulunamadı.");
    }

    const stats = calculateProcessStats(updatedDocuments);
    const processReference = doc(
      db,
      "users",
      currentUser.uid,
      "processes",
      processId,
    );

    await updateDoc(processReference, {
      requiredDocuments: updatedDocuments,
      completedDocumentCount: stats.completedDocumentCount,
      totalDocumentCount: stats.totalDocumentCount,
      progress: stats.progress,
      updatedAt: serverTimestamp(),
    });

    setProcess((currentProcess) => {
      if (!currentProcess) return currentProcess;
      const nextProcess = {
        ...currentProcess,
        requiredDocuments: updatedDocuments,
        completedDocumentCount: stats.completedDocumentCount,
        totalDocumentCount: stats.totalDocumentCount,
        progress: stats.progress,
      };
      processRef.current = nextProcess;
      return nextProcess;
    });
  }

  async function handleDeleteDocument(item: RequiredDocument) {
    if (!process || !item.fileUrl) {
      return;
    }

    const confirmed = window.confirm(
      `“${item.fileName || item.title}” dosyasını silmek istediğine emin misin?`,
    );

    if (!confirmed) {
      return;
    }

    setSuccessMessage("");
    setUploadError("");
    setDeletingDocumentKey(item.key);

    try {
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath));
      }

      const updatedDocuments = process.requiredDocuments.map((documentItem) =>
        documentItem.key === item.key
          ? {
              ...documentItem,
              status: "missing",
              fileName: "",
              fileUrl: "",
              storagePath: "",
              fileSize: 0,
              contentType: "",
              uploadedAt: null,
              ocr: null,
              ocrError: "",
            }
          : documentItem,
      );

      await persistDocuments(updatedDocuments);

      if (previewDocument?.key === item.key) {
        setPreviewDocument(null);
      }

      setSuccessMessage("Belge başarıyla silindi.");
    } catch (error) {
      console.error("Belge silinemedi:", error);
      setUploadError(
        "Belge silinemedi. Storage ve Firestore kurallarını kontrol et.",
      );
    } finally {
      setDeletingDocumentKey(null);
    }
  }

  function startRename(item: RequiredDocument) {
    setRenamingDocumentKey(item.key);
    setRenameValue(item.fileName || item.title);
    setSuccessMessage("");
    setUploadError("");
  }

  async function handleRenameDocument(item: RequiredDocument) {
    if (!process) {
      return;
    }

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      setUploadError("Dosya adı boş bırakılamaz.");
      return;
    }

    try {
      const updatedDocuments = process.requiredDocuments.map((documentItem) =>
        documentItem.key === item.key
          ? { ...documentItem, fileName: trimmedName }
          : documentItem,
      );

      await persistDocuments(updatedDocuments);
      setRenamingDocumentKey(null);
      setRenameValue("");
      setSuccessMessage("Dosya adı başarıyla güncellendi.");
    } catch (error) {
      console.error("Dosya adı güncellenemedi:", error);
      setUploadError("Dosya adı güncellenirken bir hata oluştu.");
    }
  }

  const visibleDocuments = useMemo(() => {
    if (!process) return [];
    const term = searchTerm.trim().toLocaleLowerCase("tr-TR");
    const docs = process.requiredDocuments.filter((item) => {
      const status = item.status || "missing";
      const filterMatch =
        statusFilter === "all" ||
        (statusFilter === "missing"
          ? status !== "uploaded" && status !== "approved"
          : status === statusFilter);
      const searchMatch =
        !term ||
        item.title.toLocaleLowerCase("tr-TR").includes(term) ||
        item.fileName?.toLocaleLowerCase("tr-TR").includes(term) ||
        item.description?.toLocaleLowerCase("tr-TR").includes(term);
      return filterMatch && Boolean(searchMatch);
    });
    return [...docs].sort((a, b) => {
      if (sortMode === "name") return a.title.localeCompare(b.title, "tr");
      if (sortMode === "status")
        return (a.status || "missing").localeCompare(b.status || "missing");
      if (sortMode === "date")
        return (
          (b.uploadedAt?.toMillis?.() || 0) - (a.uploadedAt?.toMillis?.() || 0)
        );
      return 0;
    });
  }, [process, searchTerm, sortMode, statusFilter]);

  async function handleBulkDelete() {
    if (!process || selectedDocumentKeys.length === 0) return;
    if (
      !window.confirm(
        `${selectedDocumentKeys.length} belgeyi silmek istediğine emin misin?`,
      )
    )
      return;
    setIsBulkDeleting(true);
    setUploadError("");
    try {
      const selected = process.requiredDocuments.filter(
        (item) => selectedDocumentKeys.includes(item.key) && item.fileUrl,
      );
      await Promise.all(
        selected.map(async (item) => {
          if (item.storagePath) {
            try {
              await deleteObject(ref(storage, item.storagePath));
            } catch (error) {
              console.warn("Dosya silinemedi:", error);
            }
          }
        }),
      );
      const updated = process.requiredDocuments.map((item) =>
        selectedDocumentKeys.includes(item.key)
          ? {
              ...item,
              status: "missing",
              fileName: "",
              fileUrl: "",
              storagePath: "",
              fileSize: 0,
              contentType: "",
              uploadedAt: null,
              ocr: null,
              ocrError: "",
            }
          : item,
      );
      await persistDocuments(updated);
      setSelectedDocumentKeys([]);
      setSuccessMessage(`${selected.length} belge silindi.`);
    } catch (error) {
      console.error(error);
      setUploadError("Toplu silme işlemi tamamlanamadı.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

          <p className="mt-4 text-sm text-slate-400">
            Süreç bilgileri yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage || !process) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center">
          <h1 className="text-2xl font-semibold">Süreç görüntülenemedi</h1>

          <p className="mt-3 text-sm leading-6 text-red-100/80">
            {errorMessage || "Süreç bilgileri bulunamadı."}
          </p>

          <Link
            href="/processes"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            Süreçlere dön
          </Link>
        </section>
      </main>
    );
  }

  const progress = Math.min(100, Math.max(0, Math.round(process.progress)));

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-[-260px] h-[560px] w-[560px] rounded-full bg-indigo-700/20 blur-[150px]" />

        <div className="absolute bottom-[-280px] right-[-180px] h-[600px] w-[600px] rounded-full bg-blue-700/10 blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          href="/processes"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Süreçlere dön
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Süreç Detayı
              </p>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
                {process.title}
              </h1>

              {process.description ? (
                <p className="mt-4 leading-7 text-slate-400">
                  {process.description}
                </p>
              ) : null}
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {getStatusLabel(process.status)}
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Genel ilerleme</p>

                <p className="mt-1 text-3xl font-bold">%{progress}</p>
              </div>

              <p className="text-sm text-slate-400">
                {process.completedDocumentCount} / {process.totalDocumentCount}{" "}
                belge
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-sm text-slate-500">Ülke</p>
              <p className="mt-2 font-semibold text-slate-100">
                {process.country}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-sm text-slate-500">Hedef tarih</p>
              <p className="mt-2 font-semibold text-slate-100">
                {formatDeadline(process.deadline)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-sm text-slate-500">Oluşturulma</p>
              <p className="mt-2 font-semibold text-slate-100">
                {formatDate(process.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <p className="text-sm text-slate-500">Kategori</p>
              <p className="mt-2 font-semibold text-slate-100">
                {process.category || "Belirtilmedi"}
              </p>
            </div>
          </div>
        </section>

        <ProcessAiPanel process={process} />

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Belgeler
              </p>

              <h2 className="mt-3 text-2xl font-bold">Gerekli belge listesi</h2>

              <p className="mt-2 text-sm text-slate-500">
                PDF, JPG, PNG veya WEBP · En fazla 10 MB
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                disabled={Boolean(uploadState || bulkProgress)}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {bulkProgress
                  ? `${bulkProgress.current}/${bulkProgress.total} yükleniyor`
                  : "Çoklu yükle"}
              </button>
              <input
                ref={bulkInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void handleBulkUpload(event)}
              />
              {selectedDocumentKeys.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={isBulkDeleting}
                  className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50"
                >
                  {isBulkDeleting
                    ? "Siliniyor..."
                    : `Seçilenleri sil (${selectedDocumentKeys.length})`}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Belge ara..."
              className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm outline-none focus:border-indigo-400/50"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm outline-none"
            >
              <option value="all">Tüm durumlar</option>
              <option value="missing">Eksik</option>
              <option value="uploaded">Yüklendi</option>
              <option value="approved">Onaylandı</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as typeof sortMode)
              }
              className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm outline-none"
            >
              <option value="default">Varsayılan sıralama</option>
              <option value="name">Ada göre</option>
              <option value="status">Duruma göre</option>
              <option value="date">Yükleme tarihine göre</option>
            </select>
          </div>

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}

          {uploadError ? (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {uploadError}
            </div>
          ) : null}

          {process.requiredDocuments.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
              Bu süreç için henüz belge listesi oluşturulmamış.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {visibleDocuments.map((item, index) => {
                const isCompleted =
                  item.status === "uploaded" || item.status === "approved";

                const isUploading = uploadState?.documentKey === item.key;
                const isAnalyzing = ocrState?.documentKey === item.key;
                const ocrEntries = Object.entries(item.ocr?.extracted || {}).filter(
                  ([, value]) => value !== null && String(value).trim() !== "",
                );

                return (
                  <article
                    key={item.key || `${item.title}-${index}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDraggedDocumentKey(item.key);
                    }}
                    onDragLeave={() => setDraggedDocumentKey(null)}
                    onDrop={(event) => void handleDrop(event, item.key)}
                    className={`rounded-2xl border p-5 transition ${draggedDocumentKey === item.key ? "border-indigo-400/60 bg-indigo-500/10" : "border-white/10 bg-black/10"}`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedDocumentKeys.includes(item.key)}
                        disabled={!item.fileUrl}
                        onChange={(event) =>
                          setSelectedDocumentKeys((current) =>
                            event.target.checked
                              ? [...current, item.key]
                              : current.filter((key) => key !== item.key),
                          )
                        }
                        className="mt-3 h-4 w-4 accent-indigo-500 disabled:opacity-30"
                        aria-label={`${item.title} belgesini seç`}
                      />
                      <div
                        className={
                          isCompleted
                            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"
                            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400"
                        }
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-100">
                              {item.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.required === false
                                ? "Duruma göre gerekli"
                                : "Zorunlu belge"}
                            </p>
                          </div>

                          <span
                            className={
                              isCompleted
                                ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200"
                                : "rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200"
                            }
                          >
                            {getDocumentStatusLabel(item.status)}
                          </span>
                        </div>

                        {item.description ? (
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {item.description}
                          </p>
                        ) : null}

                        {renamingDocumentKey === item.key ? (
                          <div className="mt-4 rounded-xl border border-indigo-400/20 bg-slate-950/70 p-3">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(event) =>
                                setRenameValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  void handleRenameDocument(item);
                                }
                                if (event.key === "Escape") {
                                  setRenamingDocumentKey(null);
                                  setRenameValue("");
                                }
                              }}
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRenameDocument(item)}
                                className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingDocumentKey(null);
                                  setRenameValue("");
                                }}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
                              >
                                Vazgeç
                              </button>
                            </div>
                          </div>
                        ) : item.fileName ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                            <p className="truncate text-sm text-indigo-200">
                              {item.fileName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.fileSize
                                ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB`
                                : ""}
                              {item.uploadedAt
                                ? ` · ${formatDate(item.uploadedAt)}`
                                : ""}
                            </p>
                          </div>
                        ) : null}

                        {isUploading ? (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Yükleniyor...</span>
                              <span>%{uploadState.progress}</span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all"
                                style={{
                                  width: `${uploadState.progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : null}

                        {isAnalyzing ? (
                          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] p-4">
                            <div className="flex items-center gap-3">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
                              <div>
                                <p className="text-sm font-semibold text-violet-100">
                                  {ocrState.mode === "saving"
                                    ? "AI sonucu kaydediliyor..."
                                    : "AI belgeyi analiz ediyor..."}
                                </p>
                                <p className="mt-1 text-xs text-violet-200/60">
                                  Metin ve belge alanları çıkarılıyor.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : item.ocr ? (
                          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                                  AI OCR sonucu
                                </p>
                                <p className="mt-1 text-sm font-semibold text-violet-100">
                                  {item.ocr.documentType || "Belge"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void analyzeDocumentWithOcr(
                                    item.key,
                                    item.fileUrl || "",
                                    item.fileName || item.title,
                                    item.contentType || "application/pdf",
                                  )
                                }
                                disabled={Boolean(uploadState || ocrState || !item.fileUrl)}
                                className="rounded-lg border border-violet-300/20 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Yeniden analiz et
                              </button>
                            </div>

                            {ocrEntries.length > 0 ? (
                              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                {ocrEntries.map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2"
                                  >
                                    <dt className="text-[11px] text-slate-500">
                                      {getOcrFieldLabel(key)}
                                    </dt>
                                    <dd className="mt-1 break-words text-sm text-slate-200">
                                      {String(value)}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            ) : null}

                            {item.ocr.rawText ? (
                              <details className="mt-4">
                                <summary className="cursor-pointer text-xs font-semibold text-violet-200">
                                  Okunan tam metni göster
                                </summary>
                                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs leading-5 text-slate-300">
                                  {item.ocr.rawText}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        ) : item.ocrError ? (
                          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                            <p className="text-sm font-semibold text-amber-100">
                              AI analizi tamamlanamadı
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-200/70">
                              {item.ocrError}
                            </p>
                            {item.fileUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void analyzeDocumentWithOcr(
                                    item.key,
                                    item.fileUrl || "",
                                    item.fileName || item.title,
                                    item.contentType || "application/pdf",
                                  )
                                }
                                disabled={Boolean(uploadState || ocrState)}
                                className="mt-3 rounded-lg border border-amber-300/20 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-50"
                              >
                                Tekrar dene
                              </button>
                            ) : null}
                          </div>
                        ) : item.fileUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              void analyzeDocumentWithOcr(
                                item.key,
                                item.fileUrl || "",
                                item.fileName || item.title,
                                item.contentType || "application/pdf",
                              )
                            }
                            disabled={Boolean(uploadState || ocrState)}
                            className="mt-4 inline-flex items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            AI ile analiz et
                          </button>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <label
                            className={
                              uploadState || ocrState
                                ? "inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400"
                                : "inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
                            }
                          >
                            {isCompleted ? "Yeni dosya yükle" : "Dosya seç"}

                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={Boolean(uploadState || ocrState)}
                              onChange={(event) =>
                                handleFileChange(event, item.key)
                              }
                            />
                          </label>

                          {item.fileUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewDocument(item)}
                                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                              >
                                Önizle
                              </button>
                              <button
                                type="button"
                                onClick={() => startRename(item)}
                                disabled={Boolean(
                                  uploadState || deletingDocumentKey,
                                )}
                                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Yeniden adlandır
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteDocument(item)}
                                disabled={Boolean(
                                  uploadState || deletingDocumentKey,
                                )}
                                className="inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingDocumentKey === item.key
                                  ? "Siliniyor..."
                                  : "Sil"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {process.notes ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Notlar
            </p>

            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">
              {process.notes}
            </p>
          </section>
        ) : null}
      </div>

      {previewDocument?.fileUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Belge önizleme"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {previewDocument.fileName || previewDocument.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {previewDocument.contentType || "Belge"}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={previewDocument.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Yeni sekmede aç
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Kapat
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-900">
              {previewDocument.contentType?.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center overflow-auto p-4">
                  <img
                    src={previewDocument.fileUrl}
                    alt={previewDocument.fileName || previewDocument.title}
                    className="max-h-full max-w-full rounded-xl object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDocument.fileUrl}
                  title={previewDocument.fileName || previewDocument.title}
                  className="h-full w-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}