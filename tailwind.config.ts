import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          strong: 'rgb(var(--color-brand-strong) / <alpha-value>)',
        },
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
      },
      boxShadow: {
        panel: '0 20px 60px -32px rgba(15, 23, 42, 0.32)',
        glow: '0 28px 90px -42px rgba(3, 8, 15, 0.9)',
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
