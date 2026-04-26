/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EDF5F8',
          100: '#D4E8EF',
          200: '#A9D1DF',
          300: '#7EBACF',
          400: '#5AA5BF',
          500: '#4A90A4',
          600: '#3B7383',
          700: '#2C5662',
          800: '#1E3A42',
          900: '#0F1D21',
        },
        sage: {
          50: '#F0F5F0',
          100: '#DCE8DD',
          200: '#B9D1BB',
          300: '#96BA99',
          400: '#7BAE7F',
          500: '#5F9663',
          600: '#4C784F',
          700: '#395A3C',
          800: '#263C28',
          900: '#131E14',
        },
        sidebar: '#2C3E50',
      },
    },
  },
  plugins: [],
}
