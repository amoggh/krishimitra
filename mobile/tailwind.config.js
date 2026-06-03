/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1b5e3b",
          dark: "#0f3d26",
        },
        green: {
          DEFAULT: "#2d8a57",
          light: "#6bc48a",
          pale: "#e8f5ec",
        },
        earth: {
          DEFAULT: "#8b6914",
          soft: "#c4a35a",
        },
        cream: {
          DEFAULT: "#f7f4ee",
          dark: "#ebe6dc",
        },
        ink: {
          DEFAULT: "#1a2e22",
          muted: "#5c6f63",
          light: "#8a9b90",
        },
        danger: "#c0392b",
        warning: "#d68910",
        success: "#27ae60",
        info: "#2980b9",
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        "sans-medium": ["PlusJakartaSans_500Medium"],
        "sans-semibold": ["PlusJakartaSans_600SemiBold"],
        "sans-bold": ["PlusJakartaSans_700Bold"],
        "sans-extrabold": ["PlusJakartaSans_800ExtraBold"],
      },
      borderRadius: {
        card: "16px",
        btn: "16px",
      },
    },
  },
  plugins: [],
};
