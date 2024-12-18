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
  },
  plugins: [],
} satisfies Config
