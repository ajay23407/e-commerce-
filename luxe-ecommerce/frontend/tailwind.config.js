/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#F0D98B',
          dark:    '#8B6914',
        },
        luxury: {
          black:  '#0A0A0A',
          cream:  '#FAF9F6',
          gray:   '#9A9890',
        },
      },
      animation: {
        'marquee':    'marquee 25s linear infinite',
        'fade-up':    'fadeUp 0.6s ease forwards',
        'slide-in':   'slideIn 0.4s cubic-bezier(0.4,0,0.2,1) forwards',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        marquee:  { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeUp:   { 'from': { opacity: 0, transform: 'translateY(24px)' }, 'to': { opacity: 1, transform: 'translateY(0)' } },
        slideIn:  { 'from': { transform: 'translateX(100%)' }, 'to': { transform: 'translateX(0)' } },
      },
      boxShadow: {
        'luxury': '0 8px 40px rgba(0,0,0,0.12)',
        'gold':   '0 4px 20px rgba(201,168,76,0.3)',
      },
    },
  },
  plugins: [],
};
