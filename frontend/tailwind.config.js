/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          abyss: '#020617', // ocean floor black
          deep: '#0b1329', // deep navy
          dark: '#1c2541', // navy blue
          medium: '#3a506b', // slate blue
          cyan: '#5bc0be', // cyan glow
          light: '#cbd5e1',
        },
        gold: {
          DEFAULT: '#d4af37', // metallic gold
          dark: '#aa8000',
          light: '#f3e5ab',
          glow: '#fffdd0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.45)',
        'cyan-glow': '0 0 20px rgba(91, 192, 190, 0.5)',
        'neon-border': '0 0 10px rgba(91, 192, 190, 0.3), inset 0 0 5px rgba(91, 192, 190, 0.2)',
        'gold-border': '0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 5px rgba(212, 175, 55, 0.2)',
      }
    },
  },
  plugins: [],
}
