import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

export default function SourceCitations({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2.5 w-full max-w-xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium py-1 transition"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>Verified Sources ({sources.length})</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 border-l-2 border-indigo-500/40 pl-3">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-indigo-300 truncate max-w-[240px] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  {src.document}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 text-[10px] font-mono">
                  Page {src.page}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] italic bg-slate-950/50 p-2 rounded border border-slate-800/50 leading-relaxed">
                "{src.excerpt}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
