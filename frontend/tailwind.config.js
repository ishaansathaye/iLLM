/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backdropBlur: {         // ensure blur utility is available
        xs: '2px',
      },
      colors: {
        glass: 'rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}