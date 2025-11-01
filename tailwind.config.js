/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}",
            "./components/**/*.{js,jsx,ts,tsx}",
          ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#DBEAFE",
        secondary: "#2563EB",
        light: {
          100: "#D6C6FF",
          200: "#A8B5DB",
          300: "#9CA4AB",
        },
        dark: {
          100: "#221F3D",
          200: "#0F0D23",
        },
        accent: "#ce9deb"
      }
    },
  },
  plugins: [],
}

