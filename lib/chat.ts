import type { ChatMessage, Conversation } from "./types";
import { db, isFirebaseConfigured } from "./firebase";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp, limit, onSnapshot, setDoc } from "firebase/firestore";
import { readableId } from "./readable-id";

const CONVERSATIONS_KEY = "vowdiseConversations";
const MESSAGES_KEY = "vowdiseMessages";

function getLocalConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CONVERSATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setLocalConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function getLocalMessages(conversationId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(`${MESSAGES_KEY}:${conversationId}`);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setLocalMessages(conversationId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${MESSAGES_KEY}:${conversationId}`, JSON.stringify(messages));
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    ...(data as Omit<Conversation, "id" | "createdAt" | "updatedAt" | "lastMessageTime">),
    id,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    lastMessageTime: data.lastMessageTime ? toIsoString(data.lastMessageTime) : undefined,
  };
}

function normalizeMessage(id: string, data: Record<string, unknown>): ChatMessage {
  return {
    ...(data as Omit<ChatMessage, "id" | "timestamp">),
    id,
    timestamp: toIsoString(data.timestamp),
  };
}

function byUpdatedAtDesc(a: Conversation, b: Conversation) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function byTimestampAsc(a: ChatMessage, b: ChatMessage) {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

function uniqueConversations(conversations: Conversation[]) {
  const byId = new Map<string, Conversation>();
  for (const conversation of conversations) byId.set(conversation.id, conversation);
  return Array.from(byId.values()).sort(byUpdatedAtDesc);
}

export async function getConversationsForUser(userId: string, role: "couple" | "vendor", vendorProfileId?: string): Promise<Conversation[]> {
  if (!isFirebaseConfigured || !db || userId.startsWith("local-")) {
    const localConversations = getLocalConversations();
    return localConversations
      .filter((conversation) => {
        if (role === "couple") return conversation.coupleId === userId;
        const belongsToVendor = conversation.vendorOwnerUid === userId || conversation.vendorId === userId;
        return belongsToVendor && (!vendorProfileId || conversation.vendorId === vendorProfileId);
      })
      .sort(byUpdatedAtDesc);
  }

  try {
    if (role === "couple") {
      const snapshot = await getDocs(
        query(
          collection(db, "conversations"),
          where("coupleId", "==", userId)
        )
      );
      return snapshot.docs
        .map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()))
        .sort(byUpdatedAtDesc);
    }

    if (vendorProfileId) {
      const snapshot = await getDocs(
        query(
          collection(db, "conversations"),
          where("vendorId", "==", vendorProfileId)
        )
      );
      return snapshot.docs
        .map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()))
        .filter((conversation) => conversation.vendorOwnerUid === userId || conversation.vendorId === userId)
        .sort(byUpdatedAtDesc);
    }

    const [ownerSnapshot, legacySnapshot] = await Promise.all([
      getDocs(query(collection(db, "conversations"), where("vendorOwnerUid", "==", userId))),
      getDocs(query(collection(db, "conversations"), where("vendorId", "==", userId))),
    ]);
    return uniqueConversations(
      [...ownerSnapshot.docs, ...legacySnapshot.docs].map((docSnapshot) =>
        normalizeConversation(docSnapshot.id, docSnapshot.data())
      )
    );
  } catch (error) {
    console.error("Failed to load conversations:", error);
    return [];
  }
}

export function subscribeToConversationsForUser(
  userId: string,
  role: "couple" | "vendor",
  onConversations: (conversations: Conversation[]) => void,
  vendorProfileId?: string
) {
  if (!isFirebaseConfigured || !db || userId.startsWith("local-")) {
    function emitLocalConversations() {
      const localConversations = getLocalConversations()
        .filter((conversation) => {
          if (role === "couple") return conversation.coupleId === userId;
          const belongsToVendor = conversation.vendorOwnerUid === userId || conversation.vendorId === userId;
          return belongsToVendor && (!vendorProfileId || conversation.vendorId === vendorProfileId);
        })
        .sort(byUpdatedAtDesc);
      onConversations(localConversations);
    }

    emitLocalConversations();

    function handleStorage(event: StorageEvent) {
      if (event.key === CONVERSATIONS_KEY) emitLocalConversations();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }

  if (role === "couple") {
    return onSnapshot(
      query(collection(db, "conversations"), where("coupleId", "==", userId)),
      (snapshot) => {
        onConversations(
          snapshot.docs
            .map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()))
            .sort(byUpdatedAtDesc)
        );
      },
      (error) => {
        console.error("Failed to subscribe to conversations:", error);
        onConversations([]);
      }
    );
  }

  if (vendorProfileId) {
    return onSnapshot(
      query(collection(db, "conversations"), where("vendorId", "==", vendorProfileId)),
      (snapshot) => {
        onConversations(
          snapshot.docs
            .map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()))
            .filter((conversation) => conversation.vendorOwnerUid === userId || conversation.vendorId === userId)
            .sort(byUpdatedAtDesc)
        );
      },
      (error) => {
        console.error("Failed to subscribe to business conversations:", error);
        onConversations([]);
      }
    );
  }

  let ownerConversations: Conversation[] = [];
  let legacyConversations: Conversation[] = [];

  function emitVendorConversations() {
    onConversations(uniqueConversations([...ownerConversations, ...legacyConversations]));
  }

  const unsubscribeOwner = onSnapshot(
    query(collection(db, "conversations"), where("vendorOwnerUid", "==", userId)),
    (snapshot) => {
      ownerConversations = snapshot.docs.map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()));
      emitVendorConversations();
    },
    (error) => console.error("Failed to subscribe to vendor-owned conversations:", error)
  );
  const unsubscribeLegacy = onSnapshot(
    query(collection(db, "conversations"), where("vendorId", "==", userId)),
    (snapshot) => {
      legacyConversations = snapshot.docs.map((docSnapshot) => normalizeConversation(docSnapshot.id, docSnapshot.data()));
      emitVendorConversations();
    },
    (error) => console.error("Failed to subscribe to legacy vendor conversations:", error)
  );

  return () => {
    unsubscribeOwner();
    unsubscribeLegacy();
  };
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  if (!isFirebaseConfigured || !db || conversationId.startsWith("local-")) {
    const localConversations = getLocalConversations();
    return localConversations.find(c => c.id === conversationId) || null;
  }

  try {
    const snapshot = await getDoc(doc(db, "conversations", conversationId));
    if (!snapshot.exists()) return null;
    return normalizeConversation(snapshot.id, snapshot.data());
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return null;
  }
}

export async function getConversationForCoupleAndVendor(coupleId: string, vendorId: string): Promise<Conversation | null> {
  if (!isFirebaseConfigured || !db) {
    const localConversations = getLocalConversations();
    return localConversations.find((conversation) => conversation.coupleId === coupleId && conversation.vendorId === vendorId) || null;
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "conversations"),
        where("coupleId", "==", coupleId),
        where("vendorId", "==", vendorId),
        limit(1)
      )
    );

    if (snapshot.empty) return null;
    const docSnapshot = snapshot.docs[0];
    return normalizeConversation(docSnapshot.id, docSnapshot.data());
  } catch (error) {
    console.error("Failed to load conversation for couple and vendor:", error);
    return null;
  }
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!isFirebaseConfigured || !db || conversationId.startsWith("local-")) {
    return getLocalMessages(conversationId);
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId)
      )
    );
    const remoteMessages = snapshot.docs
      .map((docSnapshot) => normalizeMessage(docSnapshot.id, docSnapshot.data()))
      .sort(byTimestampAsc);
    const localMessages = getLocalMessages(conversationId);
    if (localMessages.length === 0) return remoteMessages;

    const merged = new Map<string, ChatMessage>();
    for (const message of localMessages) merged.set(message.id, message);
    for (const message of remoteMessages) merged.set(message.id, message);
    return Array.from(merged.values()).sort(byTimestampAsc);
  } catch (error) {
    console.error("Failed to load messages:", error);
    return getLocalMessages(conversationId).sort(byTimestampAsc);
  }
}

export function subscribeToMessages(conversationId: string, onMessages: (messages: ChatMessage[]) => void) {
  if (!isFirebaseConfigured || !db || conversationId.startsWith("local-")) {
    onMessages(getLocalMessages(conversationId).sort(byTimestampAsc));

    function handleStorage(event: StorageEvent) {
      if (event.key === `${MESSAGES_KEY}:${conversationId}`) {
        onMessages(getLocalMessages(conversationId).sort(byTimestampAsc));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }

  const messagesQuery = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const remoteMessages = snapshot.docs
        .map((docSnapshot) => normalizeMessage(docSnapshot.id, docSnapshot.data()))
        .sort(byTimestampAsc);
      const localMessages = getLocalMessages(conversationId);
      if (localMessages.length === 0) {
        onMessages(remoteMessages);
        return;
      }

      const merged = new Map<string, ChatMessage>();
      for (const message of localMessages) merged.set(message.id, message);
      for (const message of remoteMessages) merged.set(message.id, message);
      onMessages(Array.from(merged.values()).sort(byTimestampAsc));
    },
    (error) => {
      console.error("Failed to subscribe to messages:", error);
      onMessages(getLocalMessages(conversationId).sort(byTimestampAsc));
    }
  );
}

export async function createConversation(
  coupleId: string,
  coupleName: string,
  vendorId: string,
  vendorName: string,
  vendorBusinessName?: string,
  vendorOwnerUid?: string
): Promise<Conversation> {
  const now = new Date().toISOString();
  const conversationId = `local-${readableId(`${coupleName}-${vendorBusinessName || vendorName}`, "conversation")}`;
  const newConversation: Conversation = {
    id: conversationId,
    coupleId,
    coupleName,
    vendorId,
    vendorOwnerUid,
    vendorName,
    vendorBusinessName,
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (!isFirebaseConfigured || !db || coupleId.startsWith("local-") || vendorId.startsWith("local-")) {
    const localConversations = getLocalConversations();
    localConversations.push(newConversation);
    setLocalConversations(localConversations);
    return newConversation;
  }

  try {
    const conversationRef = doc(
      collection(db, "conversations"),
      readableId(`${coupleName}-${vendorBusinessName || vendorName}`, "conversation")
    );
    await setDoc(conversationRef, {
      coupleId,
      coupleName,
      vendorId,
      vendorOwnerUid,
      vendorName,
      vendorBusinessName,
      unreadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: conversationRef.id, coupleId, coupleName, vendorId, vendorOwnerUid, vendorName, vendorBusinessName, unreadCount: 0, createdAt: now, updatedAt: now };
  } catch (error) {
    console.error("Failed to create conversation:", error);
    const localConversations = getLocalConversations();
    localConversations.push(newConversation);
    setLocalConversations(localConversations);
    return newConversation;
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: "couple" | "vendor",
  content: string
): Promise<ChatMessage> {
  const now = new Date().toISOString();
  const newMessage: ChatMessage = {
    id: `local-${readableId(senderName, "message")}`,
    conversationId,
    senderId,
    senderName,
    senderRole,
    content,
    timestamp: now,
    read: false,
  };

  if (!isFirebaseConfigured || !db || conversationId.startsWith("local-")) {
    const localMessages = getLocalMessages(conversationId);
    localMessages.push(newMessage);
    setLocalMessages(conversationId, localMessages);

    // Update conversation
    const localConversations = getLocalConversations();
    const convIndex = localConversations.findIndex(c => c.id === conversationId);
    if (convIndex !== -1) {
      localConversations[convIndex] = {
        ...localConversations[convIndex],
        lastMessage: content,
        lastMessageTime: now,
        updatedAt: now,
        unreadCount: localConversations[convIndex].unreadCount + 1,
      };
      setLocalConversations(localConversations);
    }

    return newMessage;
  }

  try {
    const messageRef = doc(
      collection(db, "messages"),
      readableId(senderName, "message")
    );
    await setDoc(messageRef, {
      conversationId,
      senderId,
      senderName,
      senderRole,
      content,
      timestamp: serverTimestamp(),
      read: false,
    });

    // Update conversation
    const conversation = await getConversation(conversationId);
    if (conversation) {
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: content,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: conversation.unreadCount + 1,
      });
    }

    return { ...newMessage, id: messageRef.id };
  } catch (error) {
    console.error("Failed to send message:", error);
    const localMessages = getLocalMessages(conversationId);
    localMessages.push(newMessage);
    setLocalMessages(conversationId, localMessages);
    return newMessage;
  }
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || conversationId.startsWith("local-")) {
    const localMessages = getLocalMessages(conversationId);
    const updated = localMessages.map(m => m.senderId !== userId ? { ...m, read: true } : m);
    setLocalMessages(conversationId, updated);

    const localConversations = getLocalConversations();
    const convIndex = localConversations.findIndex(c => c.id === conversationId);
    if (convIndex !== -1) {
      localConversations[convIndex] = { ...localConversations[convIndex], unreadCount: 0 };
      setLocalConversations(localConversations);
    }
    return;
  }

  try {
    const messages = await getMessages(conversationId);
    for (const message of messages) {
      if (message.senderId !== userId && !message.read) {
        await updateDoc(doc(db, "messages", message.id), { read: true });
      }
    }

    const conversation = await getConversation(conversationId);
    if (conversation) {
      await updateDoc(doc(db, "conversations", conversationId), { unreadCount: 0 });
    }
  } catch (error) {
    console.error("Failed to mark messages as read:", error);
  }
}

export async function findOrCreateConversation(
  coupleId: string,
  coupleName: string,
  vendorId: string,
  vendorName: string,
  vendorBusinessName?: string,
  vendorOwnerUid?: string
): Promise<Conversation> {
  const existing = await getConversationForCoupleAndVendor(coupleId, vendorId);
  if (existing) return existing;

  return createConversation(coupleId, coupleName, vendorId, vendorName, vendorBusinessName, vendorOwnerUid);
}

export async function updateCoupleNameForAccount(coupleId: string, coupleName: string): Promise<void> {
  if (!isFirebaseConfigured || !db || coupleId.startsWith("local-")) {
    const localConversations = getLocalConversations();
    const updatedConversations = localConversations.map((conversation) =>
      conversation.coupleId === coupleId ? { ...conversation, coupleName } : conversation
    );
    setLocalConversations(updatedConversations);

    for (const conversation of updatedConversations) {
      if (conversation.coupleId !== coupleId) continue;
      const localMessages = getLocalMessages(conversation.id);
      const updatedMessages = localMessages.map((message) =>
        message.senderId === coupleId && message.senderRole === "couple"
          ? { ...message, senderName: coupleName }
          : message
      );
      setLocalMessages(conversation.id, updatedMessages);
    }
    return;
  }

  try {
    const activeDb = db;
    if (!activeDb) return;

    const conversationSnapshot = await getDocs(
      query(collection(activeDb, "conversations"), where("coupleId", "==", coupleId))
    );
    await Promise.all(
      conversationSnapshot.docs.map((docSnapshot) =>
        updateDoc(doc(activeDb, "conversations", docSnapshot.id), { coupleName })
      )
    );

    const messageSnapshot = await getDocs(
      query(
        collection(activeDb, "messages"),
        where("senderId", "==", coupleId),
        where("senderRole", "==", "couple")
      )
    );
    await Promise.all(
      messageSnapshot.docs.map((docSnapshot) =>
        updateDoc(doc(activeDb, "messages", docSnapshot.id), { senderName: coupleName })
      )
    );
  } catch (error) {
    console.error("Failed to update couple name:", error);
  }
}
