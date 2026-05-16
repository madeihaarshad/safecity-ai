/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — Forest Ops
        accent: { DEFAULT: '#4ADE80', dark: '#16A34A', light: '#86EFAC' },
        gold:   { DEFAULT: '#FACC15', dark: '#CA8A04', light: '#FDE047' },
        forest: { DEFAULT: '#071309', '800': '#0A1F0D', '700': '#0F2912', '600': '#1A4020' },
        // Dark theme surfaces
        dark: {
          bg:      '#071309',
          surface: '#0A1F0D',
          card:    '#0F2912',
          border:  '#1A4020',
          muted:   '#2A5C32',
          text:    '#E6F4E8',
          subtle:  '#7FAF88',
        },
        // Light theme surfaces
        light: {
          bg:      '#F0FDF4',
          surface: '#FFFFFF',
          card:    '#FFFFFF',
          border:  '#BBF7D0',
          muted:   '#86EFAC',
          text:    '#052E16',
          subtle:  '#16A34A',
        },
      },
    },
  },
  plugins: [],
}
