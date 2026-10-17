import React from 'react';
import { BookOpen, Home } from 'lucide-react';
import UploadZone from './UploadZone';
import DocumentList from './DocumentList';

export default function Sidebar({
  documents,
  backendHealth,
  onUpload,
  isUploading,
  uploadStatus,
  onRefreshDocs,
  onDeleteDoc,
  onGoHome,
}) {
  return (
    <aside className="w-80 md:w-96 flex flex-col border-r border-slate-800 bg-[#0d1322] shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight flex items-center gap-1.5 text-white">
              KaagazAI
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                RAG
              </span>
            </h1>
            <p className="text-xs text-slate-400">Chat with Your Documents</p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              backendHealth?.status === 'healthy'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] text-slate-400">
            {backendHealth?.status === 'healthy' ? 'API Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* PDF Upload Area */}
      <UploadZone
        onUpload={onUpload}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
      />

      {/* Uploaded Documents List */}
      <DocumentList
        documents={documents}
        onRefresh={onRefreshDocs}
        onDelete={onDeleteDoc}
      />

      {/* System Tech Architecture Pills */}
      <div className="p-4 border-t border-slate-800/80 bg-[#090d16] text-[11px] text-slate-400 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span>RAG Workflow:</span>
          <span className="font-mono text-indigo-300 font-medium">LangGraph (4 Nodes)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Vector DB:</span>
          <span className="font-mono text-slate-300 font-medium">ChromaDB</span>
        </div>
        <div className="flex items-center justify-between">
          <span>LLM Engine:</span>
          <span className="font-mono text-slate-300 font-medium">
            {backendHealth?.gemini_api_configured ? 'Google Gemini' : 'Demo Local Mode'}
          </span>
        </div>
      </div>

      {/* Return to Landing Page Action */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090d16]">
        <button
          onClick={onGoHome}
          id="sidebar-home-btn"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 transition cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-indigo-400" />
          <span>Overview & Landing Page</span>
        </button>
      </div>
    </aside>
  );
}
