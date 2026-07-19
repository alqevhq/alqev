import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  AiReadinessResult,
  AiRecommendation,
  ExtractedDocumentData,
  AiChatMessage,
} from "./types";

type AiDocument =
  | "profile"
  | "readiness"
  | "recommendations"
  | "extractedData"
  | "chat";

function aiDoc(
  uid: string,
  document: AiDocument,
) {
  return doc(
    db,
    "users",
    uid,
    "ai",
    document,
  );
}

async function writeDocument(
  uid: string,
  document: AiDocument,
  data: DocumentData,
) {
  await setDoc(
    aiDoc(uid, document),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

async function readDocument<T>(
  uid: string,
  document: AiDocument,
): Promise<T | null> {
  const snapshot = await getDoc(
    aiDoc(uid, document),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as T;
}

/* -------------------------------- */
/* Readiness */
/* -------------------------------- */

export async function saveReadiness(
  uid: string,
  readiness: AiReadinessResult,
) {
  await writeDocument(
    uid,
    "readiness",
    readiness,
  );
}

export async function loadReadiness(
  uid: string,
) {
  return readDocument<AiReadinessResult>(
    uid,
    "readiness",
  );
}

/* -------------------------------- */
/* Recommendations */
/* -------------------------------- */

export async function saveRecommendations(
  uid: string,
  recommendations: AiRecommendation[],
) {
  await writeDocument(
    uid,
    "recommendations",
    {
      items: recommendations,
    },
  );
}

export async function loadRecommendations(
  uid: string,
) {
  const data =
    await readDocument<{
      items?: AiRecommendation[];
    }>(
      uid,
      "recommendations",
    );

  return data?.items ?? [];
}

/* -------------------------------- */
/* OCR */
/* -------------------------------- */

export async function saveExtractedDocuments(
  uid: string,
  documents: ExtractedDocumentData[],
) {
  await writeDocument(
    uid,
    "extractedData",
    {
      documents,
    },
  );
}

export async function loadExtractedDocuments(
  uid: string,
) {
  const data =
    await readDocument<{
      documents?: ExtractedDocumentData[];
    }>(
      uid,
      "extractedData",
    );

  return data?.documents ?? [];
}

/* -------------------------------- */
/* Chat */
/* -------------------------------- */

export async function saveChatMessages(
  uid: string,
  messages: AiChatMessage[],
) {
  await writeDocument(
    uid,
    "chat",
    {
      messages,
    },
  );
}

export async function loadChatMessages(
  uid: string,
) {
  const data =
    await readDocument<{
      messages?: AiChatMessage[];
    }>(
      uid,
      "chat",
    );

  return data?.messages ?? [];
}