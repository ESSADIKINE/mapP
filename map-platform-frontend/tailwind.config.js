/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF8CC',
          100: '#FFF3B3',
          200: '#FFE980',
          300: '#FFDE4D',
          400: '#FFD91F',
          500: '#FFD700',
          600: '#E6C100',
          700: '#B39500',
          800: '#806900',
          900: '#4D3E00',
          DEFAULT: '#FFD700',
          foreground: '#1A1A1A'
        },
        secondary: {
          50: '#E5EAF5',
          100: '#CCD5EB',
          200: '#99ACD7',
          300: '#6682C3',
          400: '#3359AF',
          500: '#001F3F',
          600: '#001A35',
          700: '#001329',
          800: '#000D1D',
          900: '#000711',
          DEFAULT: '#001F3F',
          foreground: '#F8FAFC'
        }
      },
      boxShadow: {
        glow: '0 20px 45px -15px rgba(255, 215, 0, 0.45)',
        panel: '0 18px 40px -12px rgba(0, 31, 63, 0.45)'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        fade: 'fade-in 250ms ease-in-out',
        slideUp: 'slide-up 320ms ease',
        pulseGlow: 'pulse-glow 2.4s ease-in-out infinite'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.45)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255, 215, 0, 0)' }
        }
      }
    }
  },
  plugins: [],
}