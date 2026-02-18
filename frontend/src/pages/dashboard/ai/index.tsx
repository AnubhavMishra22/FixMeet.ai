import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../../../components/ai/chat-message';
import { ChatInput } from '../../../components/ai/chat-input';
import { useToast } from '../../../stores/toast-store';
import api from '../../../lib/api';
import { Bot, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const SESSION_STORAGE_KEY = 'fixmeet-ai-chat';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: string; // ISO string for serialization
  failedContent?: string; // Original user message for retry
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Load messages from sessionStorage */
function loadMessages(): Message[] {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Message[];
  } catch {
    return [];
  }
}

/** Save messages to sessionStorage */
function saveMessages(messages: Message[]): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (content: string) => {
    if (isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Build conversation history from non-error messages
    const conversationHistory: ConversationMessage[] = messages
      .filter((m): m is Message & { role: 'user' | 'assistant' } => m.role !== 'error')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { data } = await api.post('/api/ai/chat', {
        message: content,
        conversationHistory,
      });

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } };

      if (axiosError.response?.status === 429) {
        toast({
          title: "You're chatting too fast!",
          description: 'Please wait a moment and try again.',
          variant: 'destructive',
        });
        // Remove the user message on rate limit
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } else {
        // Show error as a message in chat with retry capability
        const errorContent = axiosError.response?.data?.error?.message
          || 'Something went wrong. Please try again.';
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'error',
          content: errorContent,
          timestamp: new Date().toISOString(),
          failedContent: content,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, toast]);

  const handleRetry = useCallback((failedContent: string, errorId: string) => {
    // Remove the error message and the failed user message before it
    setMessages((prev) => {
      const errorIdx = prev.findIndex((m) => m.id === errorId);
      if (errorIdx < 0) return prev;
      // Remove error and the user message right before it
      const filtered = prev.filter((_, i) => i !== errorIdx && i !== errorIdx - 1);
      return filtered;
    });
    // Retry after a tick so state updates first
    setTimeout(() => sendMessage(failedContent), 0);
  }, [sendMessage]);

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">AI Copilot</h1>
          <p className="text-xs text-gray-500">Check availability, manage meetings, and schedule — all through chat</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-gray-400 hover:text-gray-600"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={sendMessage} />
        ) : (
          <>
            {messages.map((message) =>
              message.role === 'error' ? (
                <ErrorMessage
                  key={message.id}
                  content={message.content}
                  onRetry={
                    message.failedContent
                      ? () => handleRetry(message.failedContent!, message.id)
                      : undefined
                  }
                />
              ) : (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={new Date(message.timestamp)}
                />
              )
            )}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (msg: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Hi! I'm FixMeet AI</h2>
      <p className="text-gray-500 max-w-md mb-6">
        I can help you check your availability, manage meetings, and answer questions about your schedule.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
        {[
          { label: "What's my schedule today?", icon: '📅' },
          { label: 'Am I free tomorrow afternoon?', icon: '🕐' },
          { label: 'Schedule a meeting', icon: '✨' },
        ].map((suggestion) => (
          <button
            key={suggestion.label}
            className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-primary/30 hover:shadow-sm transition-all text-gray-600 group"
            onClick={() => onSuggestionClick(suggestion.label)}
          >
            <span className="mr-2">{suggestion.icon}</span>
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorMessage({ content, onRetry }: { content: string; onRetry?: () => void }) {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-red-500" />
      </div>
      <div className="flex flex-col items-start">
        <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-700">
          {content}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 px-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-gray-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
