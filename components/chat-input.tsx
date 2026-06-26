"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-champagne/30 bg-white p-4"
    >
      <div className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 rounded-full border border-champagne/30 bg-ivory px-5 py-3 outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="rounded-full bg-charcoal p-3 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
}
