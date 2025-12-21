import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        serif: ['var(--font-magilio)', 'serif'],
        branch: ['var(--font-branch)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'liquid-drift-1': 'liquidDrift1 20s ease-in-out infinite',
        'liquid-drift-2': 'liquidDrift2 25s ease-in-out infinite',
        'liquid-drift-3': 'liquidDrift3 15s ease-in-out infinite',
        'float-slow': 'floatSlow 12s ease-in-out infinite',
        'float-medium': 'floatMedium 8s ease-in-out infinite',
        'float-fast': 'floatFast 6s ease-in-out infinite',
      },
      keyframes: {
        liquidDrift1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '50%': { transform: 'translate(-20px, 30px) scale(0.95)' },
          '75%': { transform: 'translate(-30px, -10px) scale(1.02)' },
        },
        liquidDrift2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-40px, 20px) scale(0.98)' },
          '50%': { transform: 'translate(30px, -30px) scale(1.05)' },
          '75%': { transform: 'translate(20px, 40px) scale(0.97)' },
        },
        liquidDrift3: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
          '33%': { transform: 'translate(-45%, -55%) scale(1.1)' },
          '66%': { transform: 'translate(-55%, -45%) scale(0.9)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'rotate(12deg) translateY(0)' },
          '50%': { transform: 'rotate(15deg) translateY(-15px)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'rotate(-6deg) translateY(0)' },
          '50%': { transform: 'rotate(-3deg) translateY(-20px)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'rotate(45deg) translateY(0)' },
          '50%': { transform: 'rotate(50deg) translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
