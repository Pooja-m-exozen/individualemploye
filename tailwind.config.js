/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        'dark': '#0a0a0a',
        'dark-card': '#1f1f1f',
        'dark-secondary': '#1a1a1a',
      },
      colors: {
        dark: {
          DEFAULT: '#0a0a0a',
          card: '#1f1f1f',
          secondary: '#1a1a1a',
        }
      },
      borderColor: {
        dark: {
          DEFAULT: '#2d2d2d',
          secondary: '#404040',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}