import React from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileText,
  CheckCircle2,
  Database,
  Layers,
  Search
} from 'lucide-react';

export default function LandingPage({ onLaunchWorkspace, backendHealth }) {
  return (
    <div className="min-h-screen w-full bg-[#080c16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-800/80 bg-[#0c1220]/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">KaagazAI</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Intelligent Document Assistant</p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Backend status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth?.status === 'healthy'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-slate-300 font-medium">Ready</span>
            </div>

            {/* Launch App Button */}
            <button
              onClick={onLaunchWorkspace}
              id="header-launch-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition cursor-pointer"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center text-center">
        
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local-First Document Intelligence with LangGraph</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] max-w-3xl">
          Chat with your 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300">
                documents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          Upload any PDF document, ask nuanced questions, and get accurate answers.
        </p>

        {/* Primary Call to Action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onLaunchWorkspace}
            id="hero-launch-btn"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 active:scale-[0.98] transition cursor-pointer"
          >
            <span>Launch KaagazAI Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero sign-up required • 100% private ChromaDB local vector storage</span>
        </p>

        

        {/* 3 Core Architecture Pillars */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
          
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">4-Stage LangGraph RAG</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-node workflow checks context sufficiency and routes queries to prevent ungrounded hallucinations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">ChromaDB Vector Store</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Embeddings and semantic document vectors are stored securely on your local device.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Verified Page Citations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every synthesized claim is backed with the exact PDF page number and verbatim excerpt.
            </p>
          </div>

        </div>


      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 py-6 text-center text-xs text-slate-400">
        <p>KaagazAI • AI-Powered Document Assistant with LangChain & LangGraph</p>
      </footer>

    </div>
  );
}
