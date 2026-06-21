/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 🧡 温馨暖桃橙 — 主色（温暖、活力、可爱）
        primary: {
          50: '#FFF5F0',
          100: '#FFE8DB',
          200: '#FFD0B5',
          300: '#FFAF88',
          400: '#FF9060',
          500: '#FF7A40',
          600: '#F06525',
          700: '#CC5018',
          800: '#A03E12',
          900: '#7A3010',
        },
        // 💚 薄荷绿 — 辅色（自然、健康、清新）
        secondary: {
          50: '#F0FAF5',
          100: '#DDF5E8',
          200: '#BBEBD3',
          300: '#8EDBAD',
          400: '#5EC99B',
          500: '#3AB583',
          600: '#2A9A6C',
          700: '#217D57',
          800: '#196344',
          900: '#134D35',
        },
        // 💗 浅粉 — 强调色（可爱、温柔）
        accent: {
          50: '#FFF5F7',
          100: '#FFE4EB',
          200: '#FFCBD9',
          300: '#FFA8BF',
          400: '#FF7DA0',
          500: '#FF5580',
          600: '#EF3866',
          700: '#D12351',
          800: '#AD1843',
          900: '#8C1338',
        },
        // 🍼 奶油白 — 背景色
        cream: {
          50: '#FFFCFA',
          100: '#FFF9F5',    /* 主背景 */
          200: '#FFF0E8',    /* 次级表面 */
          300: '#FFE4D6',
          400: '#FFD4BE',
          500: '#FFBC9A',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
