"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatApiResponse = {
  answer?: unknown;
  message?: unknown;
  response?: unknown;
  result?: unknown;
  data?: {
    answer?: unknown;
    message?: unknown;
    response?: unknown;
  };
};

const CHAT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAT_API_BASE_URL?.replace(/\/$/, "") ??
  "https://externally-tight-serval.ngrok-free.app";

function readAnswer(payload: ChatApiResponse) {
  const answer =
    payload.answer ??
    payload.data?.answer ??
    payload.response ??
    payload.data?.response ??
    payload.message ??
    payload.data?.message ??
    payload.result;

  if (typeof answer === "string" && answer.trim()) {
    return answer;
  }

  return "Tôi đã nhận được câu hỏi nhưng API chưa trả về nội dung trả lời.";
}

export default function CitizenAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Xin chào, tôi là trợ lý người dân. Bạn cần hỏi về thủ tục, hồ sơ hay điều kiện thực hiện dịch vụ công nào?",
    },
  ]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function openChat() {
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch(`${CHAT_API_BASE_URL}/chat/ask`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`);
      }

      const payload = (await response.json()) as ChatApiResponse;
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: readAnswer(payload),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "Chưa kết nối được API trợ lý. Vui lòng kiểm tra backend chatbot hoặc cấu hình NEXT_PUBLIC_CHAT_API_BASE_URL.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0d6efd] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0b5ed7]"
        onClick={openChat}
        type="button"
      >
        <MessageCircle className="h-4 w-4" />
        Trợ lý người dân
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f172a]/40 p-4 sm:items-center">
          <section className="flex h-[min(720px,calc(100vh-32px))] w-full max-w-[520px] flex-col overflow-hidden rounded-md border border-[#dfe3e8] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-[#dfe3e8] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef6ff] text-[#0d6efd]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#182433]">
                    Trợ lý người dân
                  </h2>
                  <p className="text-sm text-[#667085]">
                    Hỏi đáp thủ tục hành chính công
                  </p>
                </div>
              </div>
              <button
                aria-label="Đóng trợ lý"
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f5f9] hover:text-[#182433]"
                onClick={() => setIsOpen(false)}
                title="Đóng"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-4 py-4">
              {messages.map((message) => (
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[86%] rounded-md px-3 py-2 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-[#0d6efd] text-white"
                        : "border border-[#dfe3e8] bg-white text-[#182433]"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isSending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-3 py-2 text-sm text-[#667085] shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang trả lời...
                  </div>
                </div>
              ) : null}
            </div>

            <form
              className="border-t border-[#dfe3e8] bg-white p-3"
              onSubmit={askAssistant}
            >
              <div className="flex items-end gap-2">
                <textarea
                  className="min-h-11 flex-1 resize-none rounded-md border border-[#d8dee8] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#c7defd]"
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ví dụ: Tôi muốn mở quán karaoke thì cần chuẩn bị hồ sơ gì?"
                  ref={inputRef}
                  rows={2}
                  value={question}
                />
                <button
                  aria-label="Gửi câu hỏi"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0d6efd] text-white shadow-sm hover:bg-[#0b5ed7] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!question.trim() || isSending}
                  title="Gửi"
                  type="submit"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
