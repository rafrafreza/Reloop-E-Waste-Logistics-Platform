/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F4EF",
        paperdim: "#E7EAE2",
        ink: "#16221D",
        inkfaint: "#4B5B53",
        slate: "#44535B",
        slatelight: "#7C8B90",
        circuit: "#2E6B4C",
        circuitdark: "#1F4C36",
        circuitlight: "#DCE9DF",
        copper: "#A6501C",
        copperlight: "#F2E1CF",
        amber: "#C1791F",
        amberlight: "#F5E6CC",
        brick: "#AE3B32",
        bricklight: "#F3DAD6",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 34, 29, 0.06)",
        stamp: "0 2px 8px rgba(22, 34, 29, 0.12)",
      },
      keyframes: {
        stampIn: {
          "0%": { opacity: "0", transform: "rotate(-8deg) scale(1.4)" },
          "60%": { opacity: "1", transform: "rotate(-8deg) scale(0.95)" },
          "100%": { opacity: "1", transform: "rotate(-8deg) scale(1)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        stamp: "stampIn 0.35s ease-out",
        rise: "riseIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
