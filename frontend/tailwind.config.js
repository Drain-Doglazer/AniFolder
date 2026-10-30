/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      ringColor: { DEFAULT: '#a884b5' },
      colors: {
        gray: { 50: '#faf7fb', 100: '#f1ebf2', 200: '#ded4e1', 300: '#cbbfce', 400: '#b9adbe', 500: '#998da0', 600: '#796c80', 700: '#514558', 800: '#3d3442', 900: '#211c26', 950: '#17131a' },
        accent: { DEFAULT: '#a884b5', hover: '#ba9ac5' },
      },
    },
  },
  plugins: [],
}

