import { ThemeId } from '../types';
export type { ThemeId };

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  cardColor: string;
  textColor: string;
  borderColor: string;
  subtleColor: string;
  tagline?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'ghibli-meadow',
    name: "Totoro's Meadow (Ghibli)",
    description: 'Lush sunlit moss, warm cedar, and painted watercolor meadow grass',
    tagline: 'Lush Japanese countryside nostalgia',
    isDark: false,
    accentColor: '#5B8C32',
    secondaryColor: '#3F6423',
    bgColor: '#FAF8F0',
    cardColor: '#FFFFFF',
    textColor: '#24271C',
    borderColor: '#E3DCC8',
    subtleColor: '#F2ECE1',
  },
  {
    id: 'ghibli-laputa',
    name: 'Laputa Sky Castle',
    description: 'Ancient overgrown floating island with sky azure, ivy, and lapis crystals',
    tagline: 'Floating stone ruins & cerulean skies',
    isDark: false,
    accentColor: '#307EA8',
    secondaryColor: '#205876',
    bgColor: '#F0F7F7',
    cardColor: '#FFFFFF',
    textColor: '#19262C',
    borderColor: '#CDE4E3',
    subtleColor: '#E1F0F0',
  },
  {
    id: 'ghibli-howl',
    name: "Howl's Secret Garden",
    description: 'Alpine flower pasture with soft wildflower lilac, rose terracotta, and mountain breeze',
    tagline: 'Moving castle flower vales',
    isDark: false,
    accentColor: '#845EC2',
    secondaryColor: '#5C3893',
    bgColor: '#FAF6F4',
    cardColor: '#FFFFFF',
    textColor: '#2B2628',
    borderColor: '#E6DCD9',
    subtleColor: '#F4ECE8',
  },
  {
    id: 'ghibli-kiki',
    name: "Kiki's Seaside Town",
    description: 'Mediterranean terracotta roofs, seaside wind, and bakery warm amber',
    tagline: 'Coastal bakery & broomstick skies',
    isDark: false,
    accentColor: '#E07A5F',
    secondaryColor: '#B8583E',
    bgColor: '#FDF8F3',
    cardColor: '#FFFFFF',
    textColor: '#2E221E',
    borderColor: '#EBDCCE',
    subtleColor: '#F7ECE1',
  },
  {
    id: 'ghibli-night',
    name: 'Spirited Bathhouse Twilight',
    description: 'Deep indigo night sky with warm glowing paper lanterns and spirit embers',
    tagline: 'Twilight bathhouse & spirit embers',
    isDark: true,
    accentColor: '#F4A261',
    secondaryColor: '#E76F51',
    bgColor: '#101726',
    cardColor: '#172238',
    textColor: '#F8FAFC',
    borderColor: '#253555',
    subtleColor: '#131D30',
  },
  {
    id: 'botanical',
    name: 'Botanical Sage',
    description: 'Clean light warm aesthetic with soft leaf-green study accents',
    tagline: 'Simple botanical focus',
    isDark: false,
    accentColor: '#6B9E3A',
    secondaryColor: '#476E24',
    bgColor: '#FAF9F5',
    cardColor: '#FFFFFF',
    textColor: '#1C1917',
    borderColor: '#E7E5E4',
    subtleColor: '#F5F5F4',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Midnight',
    description: 'Charcoal dark mode with soothing neon emerald highlights',
    tagline: 'Dark minimalist focus',
    isDark: true,
    accentColor: '#4ADE80',
    secondaryColor: '#22C55E',
    bgColor: '#0B0F19',
    cardColor: '#141D2E',
    textColor: '#F8FAFC',
    borderColor: '#1E2B42',
    subtleColor: '#0E1524',
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    description: 'Cozy terracotta and golden amber tones for evening reading',
    tagline: 'Warm golden hour study',
    isDark: false,
    accentColor: '#F59E0B',
    secondaryColor: '#D97706',
    bgColor: '#FFF9F2',
    cardColor: '#FFFFFF',
    textColor: '#292524',
    borderColor: '#FED7AA',
    subtleColor: '#FFF1E6',
  },
];

export function applyTheme(themeId: ThemeId) {
  const root = document.documentElement;
  const body = document.body;
  
  root.setAttribute('data-theme', themeId);
  if (body) {
    body.setAttribute('data-theme', themeId);
  }
  localStorage.setItem('oopsly_theme', themeId);

  const option = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];

  if (option.isDark) {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }

  // Set CSS variables directly on root and body for instantaneous universal theme styling
  const setVars = (el: HTMLElement) => {
    el.style.setProperty('--theme-bg', option.bgColor);
    el.style.setProperty('--theme-card', option.cardColor);
    el.style.setProperty('--theme-text', option.textColor);
    el.style.setProperty('--theme-accent', option.accentColor);
    el.style.setProperty('--theme-secondary', option.secondaryColor);
    el.style.setProperty('--theme-border', option.borderColor);
    el.style.setProperty('--theme-subtle', option.subtleColor);
  };

  setVars(root);
  if (body) setVars(body);

  // Dispatch custom event for any listening reactive elements
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oopsly-theme-applied', { detail: { themeId, option } }));
  }
}

export function saveTheme(themeId: ThemeId) {
  localStorage.setItem('oopsly_theme', themeId);
}

export function getSavedTheme(): ThemeId {
  const saved = localStorage.getItem('oopsly_theme') as ThemeId | null;
  if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
    return saved;
  }
  return 'ghibli-meadow';
}

