/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gold:  { DEFAULT: '#C9A84C', light: '#E8C96A', dark: '#9C7A2E' },
        ink:   { DEFAULT: '#0A0A0F', soft: '#12121A', muted: '#1E1E2E' },
        cream: { DEFAULT: '#FAF7F2', warm: '#F5EFE4' },
        jade:  { DEFAULT: '#2ECC71', dark: '#27AE60' },
      },
      animation: {
        'fade-up':    'fadeUp .5s cubic-bezier(.22,1,.36,1) both',
        'fade-in':    'fadeIn .4s ease both',
        'scale-in':   'scaleIn .3s cubic-bezier(.22,1,.36,1) both',
        'shimmer':    'shimmer 2s linear infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn:  { from: { opacity: 0, transform: 'scale(.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float:    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
