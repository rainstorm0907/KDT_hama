import { Check, Copy, MessageCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ProductVisual } from './ProductVisual';
import { sideButtonClass, sidePanelPositionClass } from './sideButtonStyles';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';

type SideChatbotButtonProps = {
  isOpen: boolean;
  onProductSelect?: (product: Product) => void;
  onToggle: () => void;
};

type ChatItem = {
  itemId: number;
  title: string;
  currentPrice: number;
  thumbnailUrl?: string;
  itemUrl?: string;
  platform?: string;
  recommendReason?: string;
};

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  items?: ChatItem[];
  timestamp: Date;
  intent?: string;
};

const defaultSuggestions = [
  '하마가 뭐야?',
  '아이폰 추천해줘',
  '가격 비교는 어떻게 해',
  '찜은 어떻게 해',
  '알림 설정 방법',
];

const intentSuggestions: Record<string, string[]> = {
  PRODUCT_RECOMMEND: [
    '다른 것도 추천해줘',
    '더 저렴한 거 있어?',
    '가격 비교해줘',
    '찜은 어떻게 해',
    '알림 설정 방법',
  ],
  PERSONAL_RECOMMEND: [
    '다른 것도 추천해줘',
    '가격 비교는 어떻게 해',
    '찜은 어떻게 해',
    '알림 설정 방법',
    '하마가 뭐야?',
  ],
  PRICE_COMPARE: [
    '가격 비교는 어떻게 해',
    '찜은 어떻게 해',
    '알림 설정 방법',
    '아이폰 추천해줘',
    '하마가 뭐야?',
  ],
  PRICE_ALERT_GUIDE: [
    '알림 설정 방법',
    '찜은 어떻게 해',
    '가격 비교는 어떻게 해',
    '아이폰 추천해줘',
    '하마가 뭐야?',
  ],
  WISHLIST_LIST: [
    '찜은 어떻게 해',
    '알림 설정 방법',
    '가격 비교는 어떻게 해',
    '아이폰 추천해줘',
    '하마가 뭐야?',
  ],
  GREETING: [
    '하마가 뭐야?',
    '아이폰 추천해줘',
    '가격 비교는 어떻게 해',
    '찜은 어떻게 해',
    '알림 설정 방법',
  ],
  FAQ: [
    '더 자세히 알려줘',
    '다른 기능도 알려줘',
    '아이폰 추천해줘',
    '가격 비교는 어떻게 해',
    '찜은 어떻게 해',
  ],
};

const introMessage: Message = {
  id: 'intro',
  role: 'bot',
  text: '안녕하세요! 사육사 AI입니다. 검색 방법, 가격 비교, 찜·알림 기능 등 궁금한 점을 물어보세요.',
  timestamp: new Date(),
};

const fallbackMessage = '죄송해요, 잠시 문제가 발생했습니다. 다시 시도해 주세요.';

function HippoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="6.5" cy="7" rx="2.5" ry="2" />
      <ellipse cx="17.5" cy="7" rx="2.5" ry="2" />
      <ellipse cx="12" cy="12.5" rx="9" ry="7" />
      <circle cx="9.5" cy="15.5" r="1.1" fill="white" />
      <circle cx="14.5" cy="15.5" r="1.1" fill="white" />
    </svg>
  );
}

export function SideChatbotButton({
  isOpen,
  onProductSelect,
  onToggle,
}: SideChatbotButtonProps) {
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const guideRowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageSequenceRef = useRef(0);

  const createMessageId = useCallback((prefix: 'u' | 'b') => {
    messageSequenceRef.current += 1;

    return `${prefix}-${messageSequenceRef.current}`;
  }, []);

  const copyMessage = useCallback((message: Message) => {
    navigator.clipboard
      .writeText(message.text)
      .then(() => {
        setCopiedId(message.id);
        window.setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isTyping, messages]);

  const sendMessageText = async (text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText || isTyping) {
      return;
    }

    const userMessage: Message = {
      id: createMessageId('u'),
      role: 'user',
      text: trimmedText,
      timestamp: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { answer, items, intent } = await fetchChatbotAnswer(trimmedText);
      const botMessage: Message = {
        id: createMessageId('b'),
        role: 'bot',
        text: answer,
        items,
        intent,
        timestamp: new Date(),
      };

      setMessages((current) => [...current, botMessage]);

      if (intent && intentSuggestions[intent]) {
        setSuggestions(intentSuggestions[intent]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('b'),
          role: 'bot',
          text: fallbackMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = () => {
    void sendMessageText(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative">
      <div
        className={`${sidePanelPositionClass} ${
          isOpen
            ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none translate-x-3 scale-95 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <section
          className={`flex w-[min(540px,calc(100vw-7rem))] flex-col overflow-hidden rounded-[26px] ${hairline.panel}`}
          aria-label="챗봇"
          style={{ height: 'min(700px, calc(100dvh - 7rem))' }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#AEB6C2] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D1D1F]">
                <HippoIcon className="h-5 w-5 text-white" />
              </span>
              <h2 className="text-[17px] font-black text-gray-950">사육사 AI</h2>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-900 ${hairline.secondaryButton} ${hairline.focus}`}
              aria-label="챗봇 닫기"
            >
              <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <ul
            ref={listRef}
            className="transient-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((message) => (
              <li
                key={message.id}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.role === 'bot' ? (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F]">
                    <HippoIcon className="h-4 w-4 text-white" />
                  </span>
                ) : null}

                <div
                  className={`group flex min-w-0 flex-1 flex-col ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex max-w-[82%] items-end gap-1.5">
                    {message.role === 'user' ? (
                      <CopyMessageButton
                        isCopied={copiedId === message.id}
                        onClick={() => copyMessage(message)}
                      />
                    ) : null}

                    <span
                      className={`whitespace-pre-wrap break-words rounded-[18px] px-4 py-2.5 text-[16px] font-bold leading-relaxed ${
                        message.role === 'user'
                          ? 'rounded-br-[5px] bg-[#1D1D1F] text-white'
                          : `rounded-bl-[5px] text-gray-950 ${hairline.card}`
                      }`}
                    >
                      {message.text}
                    </span>

                    {message.role === 'bot' ? (
                      <CopyMessageButton
                        isCopied={copiedId === message.id}
                        onClick={() => copyMessage(message)}
                      />
                    ) : null}
                  </div>

                  <span className="mt-1 px-1 text-[12px] font-medium text-[#86868B]">
                    {formatTime(message.timestamp)}
                  </span>

                  {message.items && message.items.length > 0 ? (
                    <ul className="mt-2 flex w-full flex-col gap-2">
                      {message.items.map((item) => (
                        <li key={item.itemId}>
                          <button
                            type="button"
                            onClick={() => openChatItem(item, onProductSelect)}
                            className={`flex w-full items-center gap-3 rounded-[16px] p-3 text-left transition-colors hover:bg-white/80 ${hairline.card} ${hairline.focus}`}
                          >
                            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-[#F3F4F6]">
                              <ProductVisual
                                imageUrl={item.thumbnailUrl ?? null}
                                name={item.title}
                                variant="thumb"
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-black text-gray-950">
                                {item.title}
                              </span>
                              <span className="mt-0.5 block text-[15px] font-black text-[#1D1D1F]">
                                {item.currentPrice
                                  ? formatWon(item.currentPrice)
                                  : '가격 미제공'}
                              </span>
                              {item.platform ? (
                                <span className="mt-0.5 block text-[13px] font-bold text-[#86868B]">
                                  {item.platform}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}

            {isTyping ? (
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F]">
                  <HippoIcon className="h-4 w-4 text-white" />
                </span>
                <span className={`flex items-center gap-1 rounded-[18px] rounded-bl-[5px] px-4 py-3.5 ${hairline.card}`}>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868B] [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868B] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86868B] [animation-delay:300ms]" />
                </span>
              </li>
            ) : null}
          </ul>

          <div className="shrink-0 border-t border-[#AEB6C2] px-3 pb-3 pt-2.5">
            <div className="relative mb-2.5 flex items-center gap-1">
              <div
                ref={guideRowRef}
                className="transient-scrollbar flex flex-1 gap-2 overflow-x-auto"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessageText(suggestion)}
                    disabled={isTyping}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-bold text-[#1D1D1F] transition-colors hover:bg-[#E7EBF0] disabled:opacity-40 ${hairline.secondaryButton} ${hairline.focus}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  guideRowRef.current?.scrollBy({ left: 160, behavior: 'smooth' })
                }
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-black text-[#626873] transition-colors hover:text-[#1D1D1F] ${hairline.secondaryButton} ${hairline.focus}`}
                aria-label="추천 질문 더 보기"
              >
                »
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                disabled={isTyping}
                className={`min-w-0 flex-1 rounded-full px-4 py-2.5 text-[16px] font-bold text-gray-950 placeholder:font-medium placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 disabled:opacity-50 ${hairline.control}`}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 ${hairline.primaryButton} ${hairline.focus}`}
                aria-label="전송"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={sideButtonClass}
        aria-label="챗봇 열기"
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}

function CopyMessageButton({
  isCopied,
  onClick,
}: {
  isCopied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#86868B] opacity-0 transition-opacity hover:text-[#1D1D1F] group-hover:opacity-100"
      aria-label="메시지 복사"
    >
      {isCopied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

async function fetchChatbotAnswer(
  text: string
): Promise<{ answer: string; items: ChatItem[]; intent?: string }> {
  const response = await fetch('/api/chatbot/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });

  if (!response.ok) {
    throw new Error('Chatbot API error');
  }

  const data = (await response.json()) as {
    answer?: string;
    items?: ChatItem[];
    intent?: string;
  };

  return {
    answer: data.answer ?? fallbackMessage,
    items: data.items ?? [],
    intent: data.intent,
  };
}

function openChatItem(
  item: ChatItem,
  onProductSelect?: (product: Product) => void
) {
  if (onProductSelect) {
    onProductSelect(chatItemToProduct(item));
    return;
  }

  window.open(item.itemUrl || '#', '_blank', 'noopener,noreferrer');
}

function chatItemToProduct(item: ChatItem): Product {
  return {
    id: item.itemId,
    platform: item.platform ?? '',
    pid: String(item.itemId),
    name: item.title,
    brand: '',
    price: item.currentPrice,
    status: '판매중',
    description: item.recommendReason ?? '',
    imageUrl: item.thumbnailUrl ?? null,
    images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    link: item.itemUrl ?? '#',
    date: '',
    category: '',
    priceHistory: [],
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
