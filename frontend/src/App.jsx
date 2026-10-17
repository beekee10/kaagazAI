import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LandingPage from './components/LandingPage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'ai',
  text: "👋 Welcome to **KaagazAI**! Upload any PDF document to begin. You can ask detailed questions, extract summaries, and verify answers with exact page citations.",
  sources: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function App() {
  // 1. Separate persistent routes: / (Landing Page) and /chat (Workspace)
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.toLowerCase();
    if (path === '/chat' || path === '/workspace' || path.startsWith('/chat') || path.startsWith('/workspace')) {
      return 'workspace';
    }
    const savedRoute = localStorage.getItem('kaagazai_current_route');
    if (savedRoute === 'workspace' && (path === '/' || path === '')) {
      return 'workspace';
    }
    return 'landing';
  });

  // 2. Persistent Chat History: loads previous chat context from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('kaagazai_chat_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to restore chat history from localStorage:', err);
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [documents, setDocuments] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Sync route changes to URL history and localStorage
  const navigateTo = (view) => {
    setCurrentView(view);
    localStorage.setItem('kaagazai_current_route', view);
    const targetPath = view === 'workspace' ? '/chat' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
  };

  // Sync URL and handle browser back/forward buttons (popstate)
  useEffect(() => {
    const targetPath = currentView === 'workspace' ? '/chat' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ view: currentView }, '', targetPath);
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/chat' || path === '/workspace') {
        setCurrentView('workspace');
        localStorage.setItem('kaagazai_current_route', 'workspace');
      } else {
        setCurrentView('landing');
        localStorage.setItem('kaagazai_current_route', 'landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('kaagazai_chat_history', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to persist chat messages to localStorage:', err);
    }
  }, [messages]);

  // Check health and fetch documents
  useEffect(() => {
    checkHealth();
    fetchDocuments();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data);
      } else {
        setBackendHealth({ status: 'offline' });
      }
    } catch {
      setBackendHealth({ status: 'offline' });
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({ type: 'error', message: 'Only PDF (.pdf) documents are supported.' });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File exceeds 25 MB size limit.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setUploadStatus({
        type: 'success',
        message: `Indexed "${data.filename}" (${data.pages} pages, ${data.chunks} chunks)!`
      });

      await fetchDocuments();
      await checkHealth();

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: `📄 Successfully uploaded and indexed **${data.filename}** (${data.pages} pages, ${data.chunks} vector chunks). What would you like to know about it?`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message || 'Error uploading document.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (filename) => {
    if (!window.confirm(`Are you sure you want to remove "${filename}" and its vector embeddings?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDocuments();
        await checkHealth();
        setUploadStatus({
          type: 'success',
          message: `Removed "${filename}" and cleaned vectors.`
        });
      } else {
        const data = await res.json();
        throw new Error(data.detail || 'Delete failed');
      }
    } catch (err) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  const handleSendMessage = async (queryText = inputQuery) => {
    const textToSend = queryText.trim();
    if (!textToSend || isChatLoading) return;

    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Extract recent conversational context to pass to the backend
    const history = messages
      .filter((m) => m.id !== 'welcome' && m.id !== 'welcome_cleared')
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          history: history,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate answer');

      const aiMsg = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: `⚠️ Error: ${err.message || 'Unable to connect to KaagazAI backend.'}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    const clearedMessages = [
      {
        id: 'welcome_cleared',
        sender: 'ai',
        text: "Chat cleared! Ask any question about your uploaded documents.",
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(clearedMessages);
    localStorage.setItem('kaagazai_chat_history', JSON.stringify(clearedMessages));
  };

  // 1. Landing Page View (Route: /)
  if (currentView === 'landing') {
    return (
      <LandingPage
        onLaunchWorkspace={() => navigateTo('workspace')}
        backendHealth={backendHealth}
      />
    );
  }

  // 2. Main Workspace View (Route: /chat)
  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      <Sidebar
        documents={documents}
        backendHealth={backendHealth}
        onUpload={handleFileUpload}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
        onRefreshDocs={fetchDocuments}
        onDeleteDoc={handleDeleteDocument}
        onGoHome={() => navigateTo('landing')}
      />

      <ChatArea
        messages={messages}
        documents={documents}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        isLoading={isChatLoading}
        onGoHome={() => navigateTo('landing')}
      />
    </div>
  );
}
