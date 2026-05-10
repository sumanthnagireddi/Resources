const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{ts,tsx,css}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
        mono: [
          'JetBrains Mono',
          'Monaco',
          'Menlo',
          'Ubuntu Mono',
          ...defaultTheme.fontFamily.mono,
        ],
      },
    },
  },
};
