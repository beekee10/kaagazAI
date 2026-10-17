import React, { useRef, useEffect } from 'react';
import { Sparkles, RefreshCw, Home } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatArea({
  messages,
  documents,
  inputQuery,
  setInputQuery,
  onSendMessage,
  onClearChat,
  isLoading,
  onGoHome,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const starterQuestions = [
    "What are the main topics discussed in this document?",
    "Summarize the key findings or conclusions.",
    "What are the specific requirements or takeaways mentioned?"
  ];

  return (
    <main className="flex-1 flex flex-col h-full bg-[#090d16]">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-[#0d1322]/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Document Q&A Assistant</span>
          </div>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'} ready
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onGoHome}
            id="header-home-btn"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <button
            onClick={onClearChat}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 mt-1">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl rounded-bl-none bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>
                Retrieving chunks from ChromaDB & evaluating LangGraph workflow...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <ChatInput
        query={inputQuery}
        setQuery={setInputQuery}
        onSend={onSendMessage}
        isLoading={isLoading}
        hasDocuments={documents.length > 0}
        suggestedQuestions={starterQuestions}
        showSuggestions={messages.length <= 2}
      />
    </main>
  );
}
