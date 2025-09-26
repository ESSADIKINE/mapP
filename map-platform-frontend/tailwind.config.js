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
        gold: {
          50: '#fff9db',
          100: '#ffef99',
          200: '#ffe566',
          300: '#ffdb33',
          400: '#ffd119',
          500: '#ffd700',
          600: '#ccac00',
          700: '#997f00',
          800: '#665200',
          900: '#332900',
        },
        navy: {
          50: '#e6f0ff',
          100: '#bfd3f5',
          200: '#96b3e3',
          300: '#6b92d1',
          400: '#4675c0',
          500: '#1e5aaa',
          600: '#13458b',
          700: '#0b3166',
          800: '#051f43',
          900: '#001f3f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 