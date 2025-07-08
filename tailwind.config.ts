import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        '6xl': ['3.75rem', { lineHeight: '1', fontWeight: '800' }],
      },
      colors: {
        // Apple-style glassmorphism colors
        'brand-primary': '#007AFF',     // Apple blue
        'brand-primary-hover': '#0056CC',
        'brand-secondary': '#34C759',   // Apple green
        'brand-accent': '#FF9500',      // Apple orange
        'brand-teal': '#30D0C4',       // Modern teal
        'brand-teal-hover': '#1FB3A8',
        'brand-purple': '#AF52DE',      // Apple purple
        
        // Glass backgrounds with Apple-style transparency
        'glass': {
          '50': 'rgba(255, 255, 255, 0.05)',
          '100': 'rgba(255, 255, 255, 0.1)',
          '200': 'rgba(255, 255, 255, 0.15)',
          '300': 'rgba(255, 255, 255, 0.2)',
          '400': 'rgba(255, 255, 255, 0.25)',
        },
        
        // Dark glass backgrounds
        'glass-dark': {
          '50': 'rgba(0, 0, 0, 0.05)',
          '100': 'rgba(0, 0, 0, 0.1)',
          '200': 'rgba(0, 0, 0, 0.15)',
          '300': 'rgba(0, 0, 0, 0.2)',
          '400': 'rgba(0, 0, 0, 0.3)',
        },
        
        // Modern navy palette
        'navy': {
          '900': '#0A0A0F',      // Deep dark background
          '800': '#1A1A24',      // Card backgrounds
          '700': '#2A2A3A',      // Lighter elements
          '600': '#3A3A4A',      // Hover states
          '500': '#4A4A5A',      // Borders
        },
        
        // Glass borders
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'glass-border-strong': 'rgba(255, 255, 255, 0.15)',
        
        // Text colors optimized for dark glass with better contrast
        'text-primary': '#FFFFFF',         // Pure white for headings
        'text-secondary': '#F8FAFC',       // Very light gray for important text
        'text-tertiary': '#E2E8F0',        // Light gray for readable secondary text
        'text-quaternary': '#CBD5E1',      // Medium gray for labels
      },
      
      backgroundImage: {
        'mesh-gradient': "url('/images/mesh-gradient.png')",
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'glass-gradient-strong': 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
        'brand-gradient': 'linear-gradient(135deg, #007AFF 0%, #30D0C4 100%)',
        'purple-gradient': 'linear-gradient(135deg, #AF52DE 0%, #007AFF 100%)',
      },
      
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        'glass-lg': '0 16px 64px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.12)',
        'glass-xl': '0 24px 96px rgba(0, 0, 0, 0.2), 0 8px 32px rgba(0, 0, 0, 0.16)',
        'glow': '0 0 20px rgba(0, 122, 255, 0.3)',
        'glow-teal': '0 0 20px rgba(48, 208, 196, 0.3)',
        'glow-purple': '0 0 20px rgba(175, 82, 222, 0.3)',
        'inner-glass': 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
      },
      
      borderRadius: {
        'lg': '1rem',
        'xl': '1.25rem', 
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
      },
      
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
      },
      
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config