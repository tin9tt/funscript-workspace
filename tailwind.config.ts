import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      primary: '#fadf23',
      'primary-variant': '#ffa757',
      'primary-content': '#424050',
      secondary: '#2347fa',
      'secondary-variant': '#AA8AE6',
      'secondary-content': '#ffffff',
      accent: '#23cffa',
      'accent-variant': '#3e5354',
      'accent-content': '#0a0a0a',
      error: '#e00000',
      'error-content': '#ffffff',
    },
    backgroundImage: {
      'lattice-primary-content-8-light': `
        repeating-linear-gradient(90deg, rgba(42,40,50, 0.06), rgba(42,40,50, 0.06) 1px, transparent 1px, transparent 32px),
        repeating-linear-gradient(0deg, rgba(42,40,50, 0.06), rgba(42,40,50, 0.06) 1px, var(--background) 1px, var(--background) 32px)
      `,
      'lattice-primary-content-8-dark': `
        repeating-linear-gradient(90deg, rgba(42,40,50, 0.4), rgba(42,40,50, 0.4) 1px, transparent 1px, transparent 32px),
        repeating-linear-gradient(0deg, rgba(42,40,50, 0.4), rgba(42,40,50, 0.4) 1px, var(--background) 1px, var(--background) 32px)
      `,
    },
  },
  plugins: [],
} satisfies Config
