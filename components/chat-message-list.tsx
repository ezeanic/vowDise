"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function ChatMessageList({
  messages,
  currentUserId,
}: {
  messages: ChatMessage[];
  currentUserId: string;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-charcoal/40">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message) => {
          const isOwn = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isOwn
                    ? "bg-charcoal text-white"
                    : "border border-champagne/30 bg-white text-charcoal"
                }`}
              >
                {!isOwn && (
                  <p className="mb-1 text-xs font-semibold text-charcoal/60">
                    {message.senderName}
                  </p>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {message.content}
                </p>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span className="text-xs opacity-60">
                    {formatTimeAgo(message.timestamp)}
                  </span>
                  {isOwn && (
                    <span className="text-xs opacity-60">
                      {message.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
