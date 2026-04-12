/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Altion brand palette
        gold: {
          DEFAULT: '#00b7d7', // Altion cyan
          light: '#22d3ee',   // hover state
        },
        dark: {
          DEFAULT: '#0A0A0A',
          surface: '#111111',
          surface2: '#1A1A1A',
          border: '#262626',
        },
        muted: '#a1a1aa',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
