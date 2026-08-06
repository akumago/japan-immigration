/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      textShadow: {
        'sm': '0 1px 2px var(--tw-shadow-color)',
        'md': '0 2px 4px var(--tw-shadow-color)',
        'lg': '0 8px 16px var(--tw-shadow-color)',
        'DEFAULT': '0 1px 3px var(--tw-shadow-color)',
      },
    },
  },
  plugins: [],
}