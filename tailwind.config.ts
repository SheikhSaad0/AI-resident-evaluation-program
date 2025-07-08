import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // A vibrant teal for primary actions and highlights
        'brand-teal': '#14b8a6',
        'brand-teal-hover': '#0d9488',
        // A rich, dark blue for the main background
        'navy': {
          '900': '#0b1120', // Main background
          '800': '#111827', // Slightly lighter dark
          '700': 'rgba(30, 41, 71, 0.25)', // Card background (more transparent)
          '600': 'rgba(55, 65, 81, 0.4)',  // Card hover
        },
        // For subtle borders on glass elements
        'glass-border': 'rgba(255, 255, 255, 0.1)',
        // Text colors for readability
        'text-primary': '#f3f4f6',   // For headings
        'text-secondary': '#d1d5db', // For body text
        'text-tertiary': '#6b7280',  // For placeholders
      },
      backgroundImage: {
        'mesh-gradient': "url('/images/mesh-gradient.png')",
      },
      // Increased blur for a more premium glass effect
      backdropBlur: {
        '2xl': '40px',
      },
      boxShadow: {
        // A soft glow for buttons and active elements
        'glow': '0 0 20px rgba(20, 184, 166, 0.5)',
      }
    },
  },
  plugins: [],
}
export default config