/** @type {import('tailwindcss').Config} */
// Colors resolve from CSS variables set at the root view (see src/lib/theme.ts).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        ['bg', 'card', 'fill', 'line', 'fg', 'muted', 'subtle', 'accent', 'success', 'danger', 'warning', 'info'].map(
          (n) => [n, token(n)],
        ),
      ),
      fontFamily: {
        display: ['Sora_700Bold'],
        'display-heavy': ['Sora_800ExtraBold'],
        'display-semi': ['Sora_600SemiBold'],
      },
      fontSize: {
        hero: ['32px', { lineHeight: '38px', letterSpacing: '-1.1px' }],
        display: ['27px', { lineHeight: '33px', letterSpacing: '-0.9px' }],
        title: ['20px', { lineHeight: '26px', letterSpacing: '-0.5px' }],
        headline: ['16px', { lineHeight: '21px', letterSpacing: '-0.2px' }],
        body: ['16px', { lineHeight: '22px', letterSpacing: '-0.1px' }],
        callout: ['15px', { lineHeight: '20px', letterSpacing: '-0.1px' }],
        footnote: ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        micro: ['11px', { lineHeight: '13px' }],
      },
    },
  },
};
