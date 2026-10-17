import React from 'react';
import { Sparkles } from 'lucide-react';
import SourceCitations from './SourceCitations';

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div
      className={`flex gap-3 max-w-3xl ${
        isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
      }`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/10 mt-1">
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-md shadow-indigo-900/20'
              : 'bg-slate-800/80 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>

        {/* Source References Accordion */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-slate-500 mt-1 px-1">
          {message.timestamp}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
          U
        </div>
      )}
    </div>
  );
}
