/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Loaded via next/font in app/layout.tsx
        display: ["var(--font-display)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        // Mission-control palette: deep void, phosphor green, warning amber,
        // signal red, terminal cyan. CRT-inspired but modern.
        void: {
          900: "#05060a",   // deepest background
          800: "#0a0d14",   // panel background
          700: "#11141d",   // elevated panel
          600: "#1a1e2a",   // borders / dividers
          500: "#2a2f3d",   // hover states
        },
        phosphor: {
          DEFAULT: "#7af0c2",  // primary readout green
          dim: "#3d8d6e",
          glow: "#a4f5d3",
        },
        amber: {
          DEFAULT: "#ffb94d",  // warnings, secondary info
          dim: "#a8772f",
        },
        signal: {
          DEFAULT: "#ff6b6b",  // alerts, telemetry red
          dim: "#9c4040",
        },
        ion: {
          DEFAULT: "#5ec5ff",  // links, GPS category
          dim: "#3a7ba6",
        },
      },
      animation: {
        "scan": "scan 8s linear infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "blink": "blink 1.5s steps(2, start) infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
