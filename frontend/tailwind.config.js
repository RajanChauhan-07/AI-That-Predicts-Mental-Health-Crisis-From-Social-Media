/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        dark: "#0f0f1a",
        card: "#1a1a2e",
        border: "#2a2a4a",
      },
    },
  },
  plugins: [],
}