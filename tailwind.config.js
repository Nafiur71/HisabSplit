/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#070A12',
          card: '#0D1322',
          elevated: '#131C31',
          surface: '#18243E',
        },
        turf: {
          neon: '#00FF66',
          glow: 'rgba(0, 255, 102, 0.25)',
          dark: '#033318',
          accent: '#10B981',
          border: 'rgba(0, 255, 102, 0.3)',
        },
        fintech: {
          bkash: '#E2136E',
          bkashDark: '#9E0B4C',
          nagad: '#F7941E',
          nagadDark: '#B86205',
          upay: '#0066B2',
          cyan: '#00F0FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'flash-update': 'flashHighlight 1.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        flashHighlight: {
          '0%': { backgroundColor: 'rgba(0, 255, 102, 0.45)', transform: 'scale(1.03)', borderColor: '#00FF66' },
          '50%': { backgroundColor: 'rgba(0, 255, 102, 0.2)', transform: 'scale(1.01)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      boxShadow: {
        'neon-turf': '0 0 20px -3px rgba(0, 255, 102, 0.35)',
        'neon-bkash': '0 0 20px -3px rgba(226, 19, 110, 0.35)',
        'neon-nagad': '0 0 20px -3px rgba(247, 148, 30, 0.35)',
        'subtle-glow': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
