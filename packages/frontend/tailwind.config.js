/** @type {import('tailwindcss').Config} */
// SG-Arts 侍達遊戲集團：精品金屬質感設計系統
// 核心主題：以黑、白、金屬灰為主體，赤紅為點綴
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 使用 class 控制 dark mode
  theme: {
    extend: {
      colors: {
        // ============================================
        // SG-Arts 品牌色彩系統
        // ============================================

        // 核心強調色 - 侍魂赤紅
        samurai: {
          DEFAULT: '#C41E3A',
          light: '#E85A6B',   // Dark mode 用
          dark: '#9A1830',
        },

        // 基底背景色
        metal: {
          white: '#FFFFFF',     // 明亮白 - 主體背景
          pearl: '#F9FAFB',     // 珍珠灰 - 卡片背景、側邊欄
          light: '#F3F4F6',     // 淺金屬灰 - 裝飾性漸層
          silver: '#E5E7EB',    // 金屬銀灰 - 邊框線
          mist: '#D1D5DB',      // 霧銀灰 - 細微裝飾
          obsidian: '#1A1A1A',  // 曜石黑 - Dark mode 背景
        },

        // 文字色彩
        ink: {
          deep: '#000000',      // 深黑 - 主標題
          carbon: '#1A1A1A',    // 碳黑 - 次級標題
          cool: '#4B5563',      // 冷灰 - 內文
          medium: '#6B7280',    // 中灰 - 副標題
          muted: '#9CA3AF',     // 淺灰 - 頁碼、標籤
        },

        // 語意色彩
        success: {
          DEFAULT: '#059669',
          light: '#10B981',
          dark: '#047857',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#F59E0B',
          dark: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#B91C1C',
        },
        info: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
      },

      fontFamily: {
        // Inter - 專業、現代、高可讀性
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      boxShadow: {
        // 精品金屬質感 - 極淡陰影
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        // Dark mode 陰影
        'dark-soft': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'dark-card': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
      },

      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },

      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
