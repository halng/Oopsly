/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */
import React, { useState } from 'react';
import { Mail, ArrowRight, Layers, Sparkles, Zap, KeyRound, CheckCircle2 } from 'lucide-react-native';
import { ApiService } from '@/services/api';
import { UserProfile } from '@/utils/types';

interface AuthPageProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await ApiService.sendOtp(email.trim());
      if (res.isSuccess) {
        setDemoCode(res.data?.demoCode || '123456');
        setOtp(res.data?.demoCode || '123456');
        setStep('otp');
      } else {
        setErrorMessage(res.message || 'Failed to send verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await ApiService.verifyOtp(email.trim(), otp.trim());
      if (res.isSuccess && res.data) {
        // If it was a signup, we might want to update the profile name here
        // For now, the mock API just returns a default user. In a real app,
        // you'd pass the name to the backend during signup.
        onSuccess(res.data.user);
      } else {
        setErrorMessage(res.message || 'Invalid or expired OTP code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await ApiService.demoLogin();
      if (res.isSuccess && res.data) {
        onSuccess(res.data.user);
      } else {
        setErrorMessage(res.message || 'Could not launch demo session.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row font-sans">
      {/* Left side: Form */}
      <div className="w-full md:w-1/2 lg:w-1/3 flex flex-col justify-center px-8 sm:px-12 py-12 bg-white shadow-2xl z-10 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)] text-white flex items-center justify-center shadow-md shadow-stone-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Oopsly</h1>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-stone-900 mb-2">
              {step === 'otp' ? 'Check your email' : mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-stone-500 text-sm">
              {step === 'otp' 
                ? `We sent a code to ${email}`
                : mode === 'login' 
                  ? 'Sign in to access your spaced repetition decks.' 
                  : 'Start learning faster and remembering longer.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none transition-all"
                  />
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim() || (mode === 'signup' && !name.trim())}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white font-bold shadow-md shadow-stone-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Processing...' : 'Continue with Email'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-center tracking-widest text-lg font-bold text-stone-900 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none transition-all"
                  />
                </div>
                {demoCode && (
                  <p className="text-xs text-[var(--theme-secondary)] mt-2 text-center font-medium bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] p-2 rounded-lg">
                    Demo code auto-filled: <span className="font-mono font-bold tracking-wider">{demoCode}</span>
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !otp.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white font-bold shadow-md shadow-stone-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Verifying...' : 'Verify & Sign In'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-sm text-stone-500 hover:text-stone-800 font-semibold cursor-pointer transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {step === 'email' && (
            <div className="pt-6 border-t border-stone-100 space-y-4">
              <p className="text-center text-sm text-stone-500">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-bold text-[var(--theme-accent)] hover:text-[#7CB342] cursor-pointer transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
              
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Quick Demo Login</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Illustration / Value Prop */}
      <div className="hidden md:flex flex-1 bg-[#FDFBF7] relative overflow-hidden items-center justify-center p-12">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-lg w-full space-y-12 relative z-10">
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-black text-stone-900 leading-tight">
              Master any subject <br/>
              <span className="text-[var(--theme-accent)]">with science.</span>
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed">
              Oopsly combines the advanced FSRS algorithm with beautiful, gamified study sessions to help you remember everything you learn.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[var(--theme-accent)]" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-lg">Smart Scheduling</h3>
                <p className="text-stone-600 mt-1">Review cards exactly when you're about to forget them.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-lg">Gamified Learning</h3>
                <p className="text-stone-600 mt-1">Grow your virtual Ghibli garden as you study.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-sky-400/10 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-lg">Rich Flashcards</h3>
                <p className="text-stone-600 mt-1">Support for markdown, code, and multimedia content.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
