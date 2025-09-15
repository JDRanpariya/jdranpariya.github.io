/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,njk,js}"],
  darkMode: 'class',
  theme: {
    extend: {
      // Simple font stack
      fontFamily: {
        'serif': ['serif'], // For body text
        'sans': ['Inter', 'system-ui', 'sans-serif'],  // For UI elements
      },
      
      // Minimal color palette - only what you need
      colors: {
        // Light mode
        'bg': '#fefae0',        // Warm cream background
        'surface': '#ffffff',    // Cards, elevated surfaces
        'text': '#2d241a',      // Main text - dark brown
        'text-light': '#6b5d44', // Secondary text - lighter brown
        'accent': '#8b4513',     // Links, buttons - saddle brown
        
        // Dark mode
        'bg-dark': '#1a1511',    // Very dark brown
        'surface-dark': '#2d241a', // Card backgrounds in dark mode
        'text-dark': '#f5f3f0',  // Light cream text
        'text-light-dark': '#d1c69a', // Muted text in dark mode
        'accent-dark': '#d4a574', // Accent color for dark mode
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    
    // Custom component classes
    function({ addComponents, theme }) {
      addComponents({
        // Base styles
        '.bg-primary': {
          '@apply bg-bg dark:bg-bg-dark': {},
        },
        '.bg-card': {
          '@apply bg-surface dark:bg-surface-dark': {},
        },
        '.text-primary': {
          '@apply text-text dark:text-text-dark': {},
        },
        '.text-secondary': {
          '@apply text-text-light dark:text-text-light-dark': {},
        },
        '.text-link': {
          '@apply text-accent dark:text-accent-dark hover:underline': {},
        },
        
        // Simple button
        '.btn': {
          '@apply px-4 py-2 rounded-md font-medium transition-colors': {},
          '@apply bg-accent text-white hover:bg-opacity-90': {},
          '@apply dark:bg-accent-dark dark:text-bg-dark': {},
        },
        
        // Article/post styling (like Salman's)
        '.prose-custom': {
          '@apply prose prose-lg max-w-none': {},
          '@apply prose-headings:text-primary prose-headings:font-serif': {},
          '@apply prose-p:text-primary prose-p:leading-relaxed': {},
          '@apply prose-a:text-link prose-a:no-underline': {},
          '@apply dark:prose-invert': {},
        }
      })
    }
  ],
}
