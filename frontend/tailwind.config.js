/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        litmus: {
          red: '#C1121F',
          redHover: '#9B0F18',
          black: '#121212',
          bg: '#F8F9FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        soft: '0 4px 20px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
};
