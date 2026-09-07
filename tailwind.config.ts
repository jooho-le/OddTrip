import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#202126',
        canvas: '#f8f5f0',
        surface: '#ffffff',
        muted: '#77736e',
        line: '#e7e1da',
        accent: '#ff5a36',
        'accent-soft': '#fff0ea',
        danger: '#c9362b',
        brand: {
          50: '#ecfdf8',
          100: '#d1faef',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a'
        },
        coral: '#f9735b',
        sun: '#f4b942'
      },
      boxShadow: {
        soft: '0 14px 40px rgba(15, 23, 42, 0.08)',
        card: '0 14px 40px rgba(32, 33, 38, 0.07)',
        modal: '0 28px 80px rgba(24, 23, 22, 0.22)'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
} satisfies Config;
