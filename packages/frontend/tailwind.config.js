/** @type {import('tailwindcss').Config} */
// UI/UX Pro Max Skill 設計系統配置
// 風格: Minimalism & Swiss Style
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色系 - 紫色漸層
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED', // 主色
          800: '#6B21A8',
          900: '#581C87',
          950: '#4C1D95', // 文字色
        },
        // 次要色 - 淺紫
        secondary: {
          DEFAULT: '#A78BFA',
          light: '#C4B5FD',
          dark: '#8B5CF6',
        },
        // CTA 橙色
        accent: {
          DEFAULT: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
        },
        // 成功/警告/危險
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        // 背景色
        background: '#FAF5FF',
        surface: '#FFFFFF',
      },
      fontFamily: {
        // Plus Jakarta Sans - 現代、友善、專業
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // 精緻陰影
        'soft': '0 2px 15px -3px rgba(124, 58, 237, 0.1), 0 4px 6px -4px rgba(124, 58, 237, 0.1)',
        'glow': '0 0 20px rgba(124, 58, 237, 0.15)',
      },
      transitionDuration: {
        // Swiss Style: 快速微妙的過渡
        '200': '200ms',
        '250': '250ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
