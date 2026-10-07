import { useColorScheme, vars } from 'nativewind';

/** Brand gradient: orange → pink. Used for CTAs, selection, progress and key graphics. */
export const BRAND = ['#FF8A1E', '#FF2D7A'] as const;
export const BRAND_START = { x: 0, y: 0 };
export const BRAND_END = { x: 1, y: 1 };

// Single source of truth for colors. Tailwind classes (bg-card, text-muted…) read these
// through CSS variables set on the root view; JS-only consumers use useColors().
export const palette = {
  dark: {
    bg: '#08080A',
    card: '#131316',
    fill: '#1C1C21',
    line: '#25252C',
    fg: '#F7F7F8',
    muted: '#A1A1AC',
    subtle: '#64646F',
    accent: '#FF5A4E',
    success: '#2BD67B',
    danger: '#FF4D5E',
    warning: '#FFB23F',
    info: '#4DA6FF',
  },
  light: {
    bg: '#FAFAFB',
    card: '#FFFFFF',
    fill: '#EFEFF3',
    line: '#E6E6EB',
    fg: '#0B0B0D',
    muted: '#696974',
    subtle: '#A4A4AF',
    accent: '#F04A3E',
    success: '#13A15A',
    danger: '#E0263C',
    warning: '#C97A06',
    info: '#1F6FEB',
  },
};

export type Colors = typeof palette.dark;
export type Scheme = keyof typeof palette;

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const toVars = (c: Colors) => vars(Object.fromEntries(Object.entries(c).map(([k, v]) => [`--${k}`, channels(v)])));

export const themeVars = { light: toVars(palette.light), dark: toVars(palette.dark) };

export function useScheme(): Scheme {
  return useColorScheme().colorScheme === 'light' ? 'light' : 'dark';
}

export function useColors() {
  return palette[useScheme()];
}
