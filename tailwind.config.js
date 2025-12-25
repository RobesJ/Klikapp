/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Add your custom fonts here
        regular: ['System'],
        medium: ['System'],
        semibold: ['System'],
        bold: ['System'],
      },
      colors: {
        primary: "#DBEAFE",
        secondary: "#2563EB",
        light_mode: {
          bg: "#0c1026f0",
          100: "#D6C6FF",
          200: "#A8B5DB",
          300: "#9CA4AB",
        },
        dark: {
          bg: "#0c1026f0",
          text_color: "#d6d3d1",
          card: {
            bg: "#353b59cc", 
            border_color: "#9ca3af"
          },
          details: {
            o_p_bg: "#717db2cc"
          },
          project: {
            state: {
              novy: "#38bdf8",
              naplanovany: "#22c55e",
              prebieha: "#f59e0b",
              pozastaveny: "#ef4444",
              ukonceny: "#a855f7",
              zruseny: "#ef4444"
            },
            type: {
              obhliadka: "#22c55e",
              montaz: "#a855f7",
              revizia: "#f59e0b",
              cistenie: "#ef4444"
            }
          },
          100: "#221F3D",
          200: "#0F0D23",
        }
      }
    },
  },
  plugins: [],
};
