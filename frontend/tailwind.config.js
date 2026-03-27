/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        bg: {
          950: '#07070A',
          925: '#0B0C10',
          900: '#0F1117',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.55)',
        glowRed: '0 0 0 1px rgba(239,68,68,0.35), 0 18px 60px rgba(0,0,0,0.55)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '0.65' },
          '70%': { transform: 'scale(1.45)', opacity: '0' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        bars: {
          '0%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
          '100%': { transform: 'scaleY(0.45)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseRing: 'pulseRing 1.2s cubic-bezier(0.2, 0.9, 0.2, 1) infinite',
        shimmer: 'shimmer 6s ease-in-out infinite',
        bars: 'bars 1.05s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

