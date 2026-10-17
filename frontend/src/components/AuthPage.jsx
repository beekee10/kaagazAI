import React, { useState } from 'react';
import { BookOpen, Lock, Mail, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000';
const DEMO_EMAIL = 'demo@kaagaz.ai';
const DEMO_PASSWORD = 'password123';

export default function AuthPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleUseDemo = () => {
    setActiveTab('login');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (activeTab === 'register' && !name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    setIsLoading(true);

    // Fast handling for demo credentials
    if (
      email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() &&
      password === DEMO_PASSWORD
    ) {
      const demoUser = {
        id: 'demo-user-001',
        name: 'Demo User',
        email: DEMO_EMAIL,
        role: 'Demo Account',
        is_demo: true,
      };
      localStorage.setItem('kaagazai_user', JSON.stringify(demoUser));
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(demoUser);
      }, 300);
      return;
    }

    if (activeTab === 'login') {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('kaagazai_user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
          return;
        } else {
          throw new Error(data.detail || data.message || 'Invalid credentials');
        }
      } catch (err) {
        // Local accounts fallback
        const localUsers = JSON.parse(localStorage.getItem('kaagazai_local_accounts') || '[]');
        const matched = localUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );

        if (matched) {
          const userObj = {
            id: matched.id,
            name: matched.name,
            email: matched.email,
            role: 'Member',
            is_demo: false,
          };
          localStorage.setItem('kaagazai_user', JSON.stringify(userObj));
          onLoginSuccess(userObj);
          return;
        }

        setErrorMsg(err.message || 'Invalid email or password.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // REGISTER
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('kaagazai_user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
          return;
        } else {
          throw new Error(data.detail || data.message || 'Registration failed');
        }
      } catch (err) {
        const localUsers = JSON.parse(localStorage.getItem('kaagazai_local_accounts') || '[]');
        if (localUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          setErrorMsg('An account with this email already exists.');
          setIsLoading(false);
          return;
        }

        const newUser = {
          id: 'user-' + Date.now(),
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'Member',
          is_demo: false,
        };
        localUsers.push(newUser);
        localStorage.setItem('kaagazai_local_accounts', JSON.stringify(localUsers));
        localStorage.setItem('kaagazai_user', JSON.stringify(newUser));
        onLoginSuccess(newUser);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Centered Minimal Auth Box */}
      <div className="w-full max-w-[420px] space-y-6">
        
        {/* Logo and App Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 items-center justify-center shadow-lg shadow-indigo-500/20 mb-1">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">KaagazAI</h1>
          <p className="text-xs text-slate-400">AI-Powered Document Assistant</p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl bg-[#0f172a]/80 border border-slate-800 p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-5">
          
          {/* Simple Demo Credential Strip */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="text-slate-300">
              <span className="text-slate-400 font-medium">Demo: </span>
              <span className="font-mono text-indigo-300">{DEMO_EMAIL}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="font-mono text-slate-300">{DEMO_PASSWORD}</span>
            </div>
            <button
              type="button"
              onClick={handleUseDemo}
              className="px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-600 border border-indigo-500/30 transition cursor-pointer"
            >
              Fill Demo
            </button>
          </div>

          {/* Clean Tab Switcher */}
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name field (Register only) */}
            {activeTab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
