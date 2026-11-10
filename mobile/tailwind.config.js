/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Core Design Tokens
        primary: {
          DEFAULT: "#145C3A",
          dark: "#0C3E26",
          light: "#1E784D",
          subtle: "#F0F7F2",
        },
        sage: {
          DEFAULT: "#E6F1E7",
          dark: "#C4DEC8",
          light: "#F2F8F3",
        },
        cream: {
          DEFAULT: "#F7F5EF",
          dark: "#EFECE3",
          muted: "#E7E4DC",
        },
        gold: {
          DEFAULT: "#E9B44C",
          light: "#FDF6E7",
          dark: "#C6932C",
        },
        ink: {
          DEFAULT: "#183B2B",
          muted: "#718078",
          light: "#9EAAA3",
        },

        // Legacy compatibility mappings
        forest: {
          DEFAULT: "#145C3A",
          dark: "#0C3E26",
          light: "#1E784D",
        },
        green: {
          DEFAULT: "#145C3A",
          light: "#2E8B57",
          pale: "#E6F1E7",
        },
        earth: {
          DEFAULT: "#E9B44C",
          soft: "#FDF6E7",
        },
        sand: {
          DEFAULT: "#E7E4DC",
        },

        // Status colors
        danger: "#C0392B",
        warning: "#D98A1B",
        success: "#145C3A",
        info: "#2B6CB0",
      },
      fontFamily: {
        sans: [
          "Manrope_400Regular",
          "PlusJakartaSans_400Regular",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        "sans-medium": [
          "Manrope_500Medium",
          "PlusJakartaSans_500Medium",
          "system-ui",
          "sans-serif",
        ],
        "sans-semibold": [
          "Manrope_600SemiBold",
          "PlusJakartaSans_600SemiBold",
          "system-ui",
          "sans-serif",
        ],
        "sans-bold": [
          "Manrope_700Bold",
          "PlusJakartaSans_700Bold",
          "system-ui",
          "sans-serif",
        ],
        "sans-extrabold": [
          "Manrope_800ExtraBold",
          "PlusJakartaSans_800ExtraBold",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
        btn: "9999px",
        pill: "9999px",
      },
      boxShadow: {
        subtle: "0 2px 8px rgba(24, 59, 43, 0.05)",
        card: "0 4px 14px rgba(24, 59, 43, 0.06)",
        elevated: "0 8px 24px rgba(24, 59, 43, 0.10)",
      },
      screens: {
        tablet: "768px",
        desktop: "1024px",
      },
    },
  },
  plugins: [],
};
