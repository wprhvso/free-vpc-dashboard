/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0d14",
        card: "rgba(18, 24, 38, 0.7)",
      }
    },
  },
  plugins: [],
}
