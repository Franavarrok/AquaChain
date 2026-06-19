/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aqua: {
          50: "#eefaff",
          100: "#d8f1ff",
          200: "#b8e6ff",
          300: "#86d6ff",
          400: "#4cbeff",
          500: "#22a1f5",
          600: "#117fd1",
          700: "#1066a8",
          800: "#13568a",
          900: "#154a72",
          950: "#0e2f4a",
        },
      },
    },
  },
  plugins: [],
};
