import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../../components/ai/chat-message';
import { ChatInput } from '../../../components/ai/chat-input';
import { useToast } from '../../../stores/toast-store';
import api from '../../../lib/api';
import { Bot, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Build conversation history (exclude the current message)
    const conversationHistory: ConversationMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data } = await api.post('/api/ai/chat', {
        message: content,
        conversationHistory,
      });

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.data.response,
        timestamp: new Date(),
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
      } else {
        toast({
          title: 'Failed to get response',
          description: axiosError.response?.data?.error?.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }

      // Remove the user message if AI failed to respond
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">FixMeet AI</h1>
          <p className="text-xs text-gray-500">Your scheduling assistant</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSend} />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        {[
          'What meetings do I have today?',
          'Am I free tomorrow at 2pm?',
          'How many bookings do I have this week?',
          'What are my event types?',
        ].map((suggestion) => (
          <button
            key={suggestion}
            className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-primary/30 transition-colors text-gray-600"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
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
