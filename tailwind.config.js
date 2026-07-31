/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#3B82F6",
        accent: "#10B981",
        danger: "#EF4444",
        background: "#F8FAFC",
        surface: "#F1F5F9",
        card: "#FFFFFF",
        textPrimary: "#1E293B",
        textSecondary: "#64748B",
        borderLight: "#E2E8F0",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
