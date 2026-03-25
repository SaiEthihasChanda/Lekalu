/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0F172A',
        'secondary': '#1E293B',
        'accent': '#3B82F6',
        'success': '#10B981',
        'danger': '#EF4444',
        'warning': '#F59E0B',
      },
      fontFamily: {
        'sans': ['system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
