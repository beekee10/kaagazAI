import React from 'react';
import { Layers, RefreshCw, FileText, Trash2 } from 'lucide-react';

export default function DocumentList({ documents, onRefresh, onDelete }) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Indexed Documents ({documents.length})
        </span>
        <button
          onClick={onRefresh}
          title="Refresh document list"
          className="text-slate-400 hover:text-slate-200 transition p-1 hover:bg-slate-800 rounded"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Empty State */}
      {documents.length === 0 ? (
        <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/30 text-center">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400">No documents indexed</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Upload a PDF file above to index its contents into ChromaDB.
          </p>
        </div>
      ) : (
        /* List of Documents */
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.filename}
              className="group p-3 rounded-xl border border-slate-800/70 bg-slate-900/60 hover:border-slate-700/90 hover:bg-slate-800/50 transition flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-medium text-slate-200 truncate"
                    title={doc.filename}
                  >
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'}
                    </span>
                    <span>•</span>
                    <span>{doc.total_chunks} chunks</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDelete(doc.filename)}
                title="Remove document and delete vector embeddings"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition shrink-0 opacity-80 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
