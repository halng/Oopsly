/*
 *    Copyright 2025 Hao Nguyen Tan
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

import React from "react";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Layers,
  Sparkles,
  Sprout,
  BrainCircuit,
  Globe,
  HeartHandshake,
} from "lucide-react-native";
import { Logger } from "@/utils";
import { APP_ROUTES } from "@/constants/routes";

export default function WelcomeScreen() {
  const logger = Logger.extend("WelcomeScreen");
  logger.debug("Rendering WelcomeScreen component");

  const router = useRouter();
  const onLoginClick = () => {
    router.push(APP_ROUTES.login);
  };
  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] flex flex-col font-sans selection:bg-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)] transition-colors"
      style={{
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-text)",
      }}
    >
      <div className="min-h-screen bg-[#FDFBF7] font-sans selection:bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] selection:text-[var(--theme-secondary)] flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-stone-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent)] text-white flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-black text-stone-900 tracking-tight text-xl">
              Oopsly
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onLoginClick}
              className="text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-sm font-bold shadow-md shadow-stone-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <section className="relative px-6 py-24 sm:py-32 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] rounded-full blur-3xl -z-10" />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Learn Faster, Remember Longer
            </div>

            <h1 className="text-5xl sm:text-7xl font-black text-stone-900 tracking-tight max-w-4xl leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Master any subject with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-secondary)]">
                spaced repetition.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Oopsly combines the scientifically-proven FSRS algorithm with a
              beautiful, relaxing gamified sanctuary to make studying your
              favorite part of the day.
            </p>

            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-lg font-bold shadow-xl shadow-stone-900/20 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300"
            >
              Start Learning for Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </section>

          {/* Feature Grid */}
          <section className="py-24 bg-white px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
                  Why choose Oopsly?
                </h2>
                <p className="text-stone-500 mt-4 text-lg">
                  Designed for focus. Built on cognitive science.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">
                    FSRS Algorithm
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    Powered by the Free Spaced Repetition Scheduler, optimizing
                    your reviews so you only study what you're about to forget.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] text-[var(--theme-secondary)] flex items-center justify-center mb-6">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">
                    Gamified Garden
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    Earn drops and plant seeds in your personal Ghibli-inspired
                    forest sanctuary as you complete focus sessions and review
                    cards.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-start hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">
                    Learn Anywhere
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    Fully functional offline support. Syncs automatically when
                    you're back online. Take your study decks wherever you go.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-stone-50 py-12 px-6 border-t border-stone-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Layers className="w-6 h-6 text-[var(--theme-accent)]" />
            <span className="font-black text-stone-900 text-lg">Oopsly</span>
          </div>
          <p className="text-stone-500 flex items-center justify-center gap-1">
            Made with <HeartHandshake className="w-4 h-4 text-rose-500" /> for
            lifelong learners.
          </p>
        </footer>
      </div>
    </div>
  );
}
