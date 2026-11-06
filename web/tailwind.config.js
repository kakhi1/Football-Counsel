/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary': 'var(--color-on-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        surface: 'var(--color-bg-surface)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        outline: 'var(--color-outline)',
        'outline-variant': 'var(--color-outline-variant)',
        error: 'var(--color-accent-error)',
        // Direct Stitch palette tokens
        stitch: {
          canvas: 'var(--color-bg-canvas)',
          sidebar: 'var(--color-bg-sidebar)',
          surface: 'var(--color-bg-surface)',
          border: 'var(--color-border)',
          primaryText: 'var(--color-text-primary)',
          mutedText: 'var(--color-text-secondary)',
          emerald: 'var(--color-accent-emerald)',
          cobalt: 'var(--color-accent-cobalt)',
          cyan: 'var(--color-accent-cyan)',
          error: 'var(--color-accent-error)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'mono-stat': ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
