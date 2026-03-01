/**** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f1117",
        surface: "#1c1f2b",
        accent: "#29d3c3",
        accentSoft: "#1fbfb0",
        border: "#2a2f45"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 10px 25px rgba(0,0,0,0.45)",
        glow: "0 0 30px rgba(41,211,195,0.35)"
      }
    }
  },
  plugins: []
};
