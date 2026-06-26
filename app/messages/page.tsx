"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Store, Users } from "lucide-react";
import { useAccountGate } from "@/components/account-gate";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { Section } from "@/components/ui";
import type { ChatMessage, Conversation } from "@/lib/types";
import { formatCoupleName, getUserProfile } from "@/lib/user-profile";
import {
  getConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  findOrCreateConversation,
  subscribeToMessages,
  subscribeToConversationsForUser,
} from "@/lib/chat";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const vendorId = searchParams.get("vendor");
  const vendorOwnerUid = searchParams.get("vendorOwner");
  const vendorProfileId = searchParams.get("vendorProfile");
  const vendorName = searchParams.get("vendorName");
  const vendorBusinessName = searchParams.get("vendorBusinessName");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coupleDisplayName, setCoupleDisplayName] = useState("");
  const [hasLoadedCoupleDisplayName, setHasLoadedCoupleDisplayName] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { account, AccountGate } = useAccountGate();
  const startingVendorConversationRef = useRef<string | null>(null);

  function dedupeMessagesById(nextMessages: ChatMessage[]) {
    const messagesById = new Map<string, ChatMessage>();
    for (const message of nextMessages) messagesById.set(message.id, message);
    return Array.from(messagesById.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  useEffect(() => {
    if (!account) {
      setConversations([]);
      setCoupleDisplayName("");
      setHasLoadedCoupleDisplayName(false);
      setIsLoading(false);
      return;
    }

    if (account.roles.couple) {
      setCoupleDisplayName(account.name);
      setHasLoadedCoupleDisplayName(false);
      void getUserProfile(account.uid).then((profile) => {
        setCoupleDisplayName(formatCoupleName(profile?.name || account.name, profile?.spouseName));
        setHasLoadedCoupleDisplayName(true);
      });
    } else {
      setHasLoadedCoupleDisplayName(true);
    }

    setIsLoading(true);
    return subscribeToConversationsForUser(
      account.uid,
      account.roles.vendor ? "vendor" : "couple",
      (userConversations) => {
        setConversations(userConversations);
        setIsLoading(false);
      },
      account.roles.vendor ? vendorProfileId || undefined : undefined
    );
  }, [account, vendorProfileId]);

  useEffect(() => {
    async function loadConversation() {
      if (!account) return;

      if (conversationId) {
        let conv: Conversation | null | undefined = conversations.find((c) => c.id === conversationId);
        if (!conv) {
          conv = await getConversation(conversationId);
        }
        if (conv) {
          setActiveConversation(conv);
          const convMessages = await getMessages(conversationId);
          setMessages(convMessages);
          await markMessagesAsRead(conversationId, account.uid);
        }
      } else if (vendorId && vendorName && account.roles.couple && vendorId !== account.uid && vendorOwnerUid !== account.uid) {
        if (!hasLoadedCoupleDisplayName) return;
        const vendorConversationKey = `${account.uid}:${vendorId}`;
        if (startingVendorConversationRef.current === vendorConversationKey) return;
        startingVendorConversationRef.current = vendorConversationKey;

        // Start or reuse an existing conversation with vendor.
        const newConv = await findOrCreateConversation(
          account.uid,
          coupleDisplayName || account.name,
          vendorId,
          vendorName,
          vendorBusinessName || undefined,
          vendorOwnerUid || undefined
        );
        setActiveConversation(newConv);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === newConv.id);
          if (exists) {
            return prev.map((c) => (c.id === newConv.id ? newConv : c));
          }
          return [newConv, ...prev];
        });
        const convMessages = await getMessages(newConv.id);
        setMessages(convMessages);
        await markMessagesAsRead(newConv.id, account.uid);
        router.replace(`/messages?conversation=${encodeURIComponent(newConv.id)}`, { scroll: false });
      } else {
        setActiveConversation(null);
        setMessages([]);
      }
    }
    loadConversation();
  }, [conversationId, vendorId, vendorOwnerUid, vendorName, vendorBusinessName, conversations, account, coupleDisplayName, hasLoadedCoupleDisplayName, router]);

  useEffect(() => {
    if (!activeConversation || !account) return;

    return subscribeToMessages(activeConversation.id, (nextMessages) => {
      setMessages(dedupeMessagesById(nextMessages));
      if (nextMessages.some((message) => message.senderId !== account.uid && !message.read)) {
        void markMessagesAsRead(activeConversation.id, account.uid);
      }
    });
  }, [activeConversation, account]);

  async function handleSendMessage(content: string) {
    if (!activeConversation || !account) return;

    const newMessage = await sendMessage(
      activeConversation.id,
      account.uid,
      account.roles.couple ? coupleDisplayName || account.name : account.name,
      account.roles.vendor ? "vendor" : "couple",
      content
    );

    setMessages((prev) => dedupeMessagesById([...prev, newMessage]));

    // Update conversation in list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: content, lastMessageTime: newMessage.timestamp, updatedAt: newMessage.timestamp }
          : c
      )
    );
  }

  function handleSelectConversation(conv: Conversation) {
    setActiveConversation(conv);
    router.replace(`/messages?conversation=${encodeURIComponent(conv.id)}`, { scroll: false });
  }

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-charcoal">
      <Section className="pb-20 pt-8 sm:pt-10">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center rounded-full border border-champagne/30 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-ivory"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Messages</p>
            <h1 className="mt-2 font-serif text-5xl font-semibold">Your conversations</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Conversation List */}
          <div className="rounded-xl border border-champagne/30 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-champagne/30 p-4">
              <h2 className="font-semibold text-charcoal">
                {account?.roles.vendor && vendorProfileId ? "Business conversations" : "All conversations"}
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-charcoal/60">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-charcoal">No conversations yet</p>
                  <p className="mt-2 text-sm text-charcoal/60">Start chatting with vendors from their profiles.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  const isVendor = account?.roles.vendor;
                  const displayName = isVendor ? conv.coupleName : conv.vendorBusinessName || conv.vendorName;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full border-b border-champagne/20 p-4 text-left transition hover:bg-ivory ${
                        isActive ? "bg-ivory border-l-4 border-l-gold" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isVendor ? (
                              <Users size={16} className="text-charcoal/40" />
                            ) : (
                              <Store size={16} className="text-charcoal/40" />
                            )}
                            <p className="font-semibold text-charcoal truncate">{displayName}</p>
                          </div>
                          {isVendor && conv.vendorBusinessName && (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/40 truncate">
                              {conv.vendorBusinessName}
                            </p>
                          )}
                          {conv.lastMessage && (
                            <p className="mt-1 text-sm text-charcoal/60 truncate">{conv.lastMessage}</p>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose text-xs font-semibold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="rounded-xl border border-champagne/30 bg-white shadow-sm overflow-hidden">
            {activeConversation ? (
              <>
                <div className="border-b border-champagne/30 p-4">
                  <div>
                    <h2 className="font-semibold text-charcoal">
                      {account?.roles.vendor
                        ? activeConversation.coupleName
                        : activeConversation.vendorBusinessName || activeConversation.vendorName}
                    </h2>
                    <p className="text-sm text-charcoal/60">
                      {account?.roles.vendor ? "Couple" : "Vendor"}
                    </p>
                  </div>
                </div>
                <div className="h-[500px] flex flex-col">
                  <ChatMessageList messages={messages} currentUserId={account?.uid || ""} />
                  <ChatInput onSend={handleSendMessage} disabled={!account} />
                </div>
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <p className="font-semibold text-charcoal">Select a conversation</p>
                  <p className="mt-2 text-sm text-charcoal/60">Choose a conversation from the list to start chatting.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
      <AccountGate />
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
