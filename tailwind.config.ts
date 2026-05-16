import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f6f7fb',
          100: '#eceef5',
          200: '#d6dae8',
          300: '#b1b8cf',
          400: '#828bab',
          500: '#5e668a',
          600: '#454c6c',
          700: '#343a55',
          800: '#1e2237',
          900: '#12162a',
          950: '#0a0d1f',
        },
        accent: {
          DEFAULT: '#7c5cff',
          400: '#9b85ff',
          500: '#7c5cff',
          600: '#5e3df0',
          700: '#492dc7',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,.35), 0 12px 40px -10px rgba(124,92,255,.45)',
        card: '0 1px 0 rgba(255,255,255,.04) inset, 0 8px 28px -12px rgba(0,0,0,.6)',
      },
      animation: {
        'pulse-soft': 'pulse 2.4s cubic-bezier(.4,0,.6,1) infinite',
        'fade-in': 'fadeIn .35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
