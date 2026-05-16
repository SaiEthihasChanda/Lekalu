/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': 'rgb(var(--color-primary) / <alpha-value>)',
        'secondary': 'rgb(var(--color-secondary) / <alpha-value>)',
        'accent': 'rgb(var(--color-accent) / <alpha-value>)',
        'success': '#10B981',
        'danger': '#EF4444',
        'warning': '#F59E0B',
        'white': 'rgb(var(--c-white, 255 255 255) / <alpha-value>)',
        'black': 'rgb(var(--c-black, 0 0 0) / <alpha-value>)',
        'gray': {
          50: 'rgb(var(--c-gray-50, 249 250 251) / <alpha-value>)',
          100: 'rgb(var(--c-gray-100, 243 244 246) / <alpha-value>)',
          200: 'rgb(var(--c-gray-200, 229 231 235) / <alpha-value>)',
          300: 'rgb(var(--c-gray-300, 209 213 219) / <alpha-value>)',
          400: 'rgb(var(--c-gray-400, 156 163 175) / <alpha-value>)',
          500: 'rgb(var(--c-gray-500, 107 114 128) / <alpha-value>)',
          600: 'rgb(var(--c-gray-600, 75 85 99) / <alpha-value>)',
          700: 'rgb(var(--c-gray-700, 55 65 81) / <alpha-value>)',
          800: 'rgb(var(--c-gray-800, 31 41 55) / <alpha-value>)',
          900: 'rgb(var(--c-gray-900, 17 24 39) / <alpha-value>)',
          950: 'rgb(var(--c-gray-950, 3 7 18) / <alpha-value>)',
        }
      },
      fontFamily: {
        'sans': ['system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
