/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // App-wide dark theme, unified with the landing page's Cursor-IDE-inspired system.
        // Keeping the `vscode` key name: every component already references bg-vscode-*,
        // text-vscode-*, border-vscode-* — repointing values here reskins the whole app.
        vscode: {
          bg: '#0A0A0B',
          sidebar: '#101012',
          panel: '#131315',
          border: '#232326',
          hover: '#191A1D',
          active: '#1D1B3A',
          text: '#EDEDEF',
          textMuted: '#8A8A8F',
          accent: '#7C7CFF',
          accentHover: '#9A9AFF',
          error: '#F87171',
          success: '#22C55E',
          warning: '#FBBF24',
        },
        // Landing page — Cursor-IDE-inspired: near-monochrome, one muted accent used sparingly.
        land: {
          ink: '#0A0A0B',
          surface: '#131315',
          surfaceHover: '#191A1D',
          line: '#232326',
          paper: '#EDEDEF',
          muted: '#8A8A8F',
          accent: '#7C7CFF',
          accentHover: '#9A9AFF',
          signal: '#6EE7B7',
        },
        // shadcn/ui semantic tokens — resolve to the RGB-triple CSS vars in src/index.css.
        // rgb(var(--x) / <alpha-value>) lets opacity modifiers (bg-primary/10) work.
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'Monaco', 'monospace'],
        sans: ['"Inter"', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'caret-blink': 'caretBlink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        caretBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
