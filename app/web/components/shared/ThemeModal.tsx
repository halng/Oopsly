'use client'
import React from 'react';
import { Palette, Check, Sparkles, X, Sun, Moon } from 'lucide-react';
import { THEME_OPTIONS, ThemeId, applyTheme } from '@/utils/theme';

interface ThemeModalProps {
  isOpen: boolean;
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onClose: () => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="theme-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        id="theme-modal"
        data-testid="theme-modal"
        style={{
          backgroundColor: 'var(--theme-card)',
          borderColor: 'var(--theme-border)',
        }}
        className="rounded-3xl max-w-xl w-full p-6 shadow-2xl border space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--theme-subtle)',
                color: 'var(--theme-accent)',
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--theme-text)]">
                Visual Themes
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Personalize your study atmosphere, colors, and active recall interfaces
              </p>
            </div>
          </div>

          <button
            id="close-theme-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = theme.id === currentTheme;
            return (
              <button
                key={theme.id}
                id={`theme-option-${theme.id}`}
                data-testid={`theme-option-${theme.id}`}
                onClick={() => {
                  applyTheme(theme.id);
                  onSelectTheme(theme.id);
                }}
                style={{
                  backgroundColor: isSelected ? theme.subtleColor : theme.cardColor,
                  borderColor: isSelected ? theme.accentColor : theme.borderColor,
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  isSelected ? 'ring-2 shadow-sm' : 'hover:opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full shadow-2xs border border-white/40"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <h3 className="text-sm font-bold" style={{ color: theme.textColor }}>
                      {theme.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {theme.isDark ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-bold border border-stone-700">
                        <Moon className="w-2.5 h-2.5" />
                        Dark
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        <Sun className="w-2.5 h-2.5 text-amber-500" />
                        Light
                      </span>
                    )}

                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full text-white flex items-center justify-center"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>

                <p
                  className="text-xs line-clamp-2 leading-relaxed"
                  style={{ color: theme.isDark ? '#94A3B8' : '#64748B' }}
                >
                  {theme.description}
                </p>

                {/* Color Swatch Preview Bar */}
                <div className="flex items-center gap-1.5 pt-1">
                  <div
                    className="h-2.5 flex-1 rounded-full shadow-2xs border border-stone-300/40"
                    style={{ backgroundColor: theme.bgColor }}
                    title="Background"
                  />
                  <div
                    className="h-2.5 flex-1 rounded-full shadow-2xs border border-stone-300/40"
                    style={{ backgroundColor: theme.cardColor }}
                    title="Card surface"
                  />
                  <div
                    className="h-2.5 flex-1 rounded-full shadow-2xs"
                    style={{ backgroundColor: theme.accentColor }}
                    title="Primary Accent"
                  />
                  <div
                    className="h-2.5 flex-1 rounded-full shadow-2xs"
                    style={{ backgroundColor: theme.secondaryColor }}
                    title="Secondary Highlight"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--theme-border)]">
          <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
            Themes apply instantly and sync across all sessions
          </span>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'var(--theme-accent)' }}
            className="px-5 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
