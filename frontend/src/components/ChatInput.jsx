import React from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({
  query,
  setQuery,
  onSend,
  isLoading,
  hasDocuments,
  suggestedQuestions = [],
  showSuggestions = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSend(query);
    }
  };

  return (
    <div className="p-4 border-t border-slate-800/80 bg-[#0d1322]/40 backdrop-blur-md">
      {/* Starter suggestions when chat has few messages */}
      {showSuggestions && hasDocuments && (
        <div className="max-w-4xl mx-auto mb-3">
          <p className="text-xs text-slate-500 mb-2 font-medium">Suggested inquiries:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSend(q)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              hasDocuments
                ? "Ask any question about your uploaded documents..."
                : "Upload a PDF above to ask questions..."
            }
            disabled={isLoading}
            className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className={`h-11 px-5 rounded-xl font-medium text-sm flex items-center gap-2 transition ${
            !query.trim() || isLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
          }`}
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
