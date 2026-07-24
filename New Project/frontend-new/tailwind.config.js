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
        // Premium dark theme — no blue family. Amber accent on a graphite-black neutral scale.
        // Keeping the `vscode` key name: every component already references bg-vscode-*,
        // text-vscode-*, border-vscode-* — repointing values here reskins the whole app.
        vscode: {
          bg: '#0D0F12',
          sidebar: '#15181D',
          panel: '#1C2027',
          border: '#292E38',
          hover: '#20242C',
          active: '#3A2A14',
          text: '#F4F4F5',
          textMuted: '#A1A1AA',
          accent: '#E8A855',
          accentHover: '#F0BE7A',
          error: '#F87171',
          success: '#22C55E',
          warning: '#FBBF24',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'Monaco', 'monospace'],
        sans: ['"Inter"', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
      },
    },
  },
  plugins: [],
};
