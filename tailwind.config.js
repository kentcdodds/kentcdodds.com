const path = require('path')
const defaultTheme = require('tailwindcss/defaultTheme')
const fromRoot = p => path.join(__dirname, p)

module.exports = {
  // the NODE_ENV thing is for https://github.com/Acidic9/prettier-plugin-tailwind/issues/29
  mode: process.env.NODE_ENV ? 'jit' : undefined,
  darkMode: 'class',
  variants: {
    opacity: ['responsive', 'hover', 'focus', 'dark'],
    boxShadow: ['responsive', 'hover', 'focus', 'dark'],
  },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#fff',
      black: '#000',

      gray: {
        900: '#1F2028',
        800: '#2E3039',
        600: '#4B4C53',
        500: '#535661',
        400: '#818890',
        300: '#DDE0E4',
        200: '#E6E9EE',
        100: '#F7F7F7',
      },
      blueGray: {
        500: '#A9ADC1',
      },
      team: {
        // TODO: decide if this is a good color
        unknown: '#818890',
        yellow: '#FFD644',
        blue: '#36A3FF',
        red: '#FF4545',
      },
      yellow: {
        500: '#FFD644',
      },
      blue: {
        500: '#4B96FF',
        100: '#E8F2FF',
      },
      green: {
        500: '#30C85E',
        100: '#E7F9ED',
      },
    },

    extend: {
      fontFamily: {
        sans: ['Matter', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        xl: '1.375rem', // 22px
        '2xl': '1.5625rem', // 25px
        '3xl': '1.875rem', // 30px
        '4xl': '2.5rem', // 40px
        '5xl': '3.125rem', // 50px
        '6xl': '3.75rem', // 60px
        '7xl': '4.375rem', // 70px
      },
      gridTemplateRows: {
        'max-content': 'max-content',
      },
      spacing: {
        '5vw': '5vw', // pull featured sections and navbar in the margin
        '8vw': '8vw', // positions hero img inside the margin
        '10vw': '10vw', // page margin
      },
      rotate: {
        '-135': '-135deg',
        135: '135deg',
      },

      typography: theme => {
        return {
          DEFAULT: {
            css: [
              {
                color: theme('colors.gray.500'),
                '> *': {
                  gridColumn: '1 / -1',

                  [`@media (min-width: ${theme('screens.lg')})`]: {
                    gridColumn: '3 / span 8',
                  },
                },
                p: {
                  marginTop: theme('spacing.10'),
                  marginBottom: 0,
                  fontSize: theme('fontSize.lg.0'),
                },
                a: {
                  color: theme('colors.black'),
                  textDecoration: 'none',
                },
                strong: {
                  color: theme('colors.black'),
                  fontWeight: theme('fontWeight.medium'),
                },
                code: {
                  color: theme('colors.gray.800'),
                },
                ul: {
                  marginTop: theme('spacing.10'),
                  marginBottom: 0,
                },
                'h1, h2, h3, h4, h5, h6': {
                  color: theme('colors.black'),
                  marginBottom: 0,
                  fontWeight: theme('fontWeight.normal'),

                  [`@media (min-width: ${theme('screens.lg')})`]: {
                    fontWeight: theme('fontWeight.medium'),
                  },
                },
                'h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + *': {
                  marginTop: theme('spacing.10'),
                },
                // tailwind doesn't stick to this property order, so we can't make 'h3' overrule 'h2, h3, h4'
                'h1, h2': {
                  fontSize: theme('fontSize.2xl.0'),
                  marginTop: theme('spacing.32'),
                  [`@media (min-width: ${theme('screens.lg')})`]: {
                    fontSize: theme('fontSize.3xl.0'),
                  },
                },
                h3: {
                  fontSize: theme('fontSize.xl.0'),
                  marginTop: theme('spacing.24'),
                  [`@media (min-width: ${theme('screens.lg')})`]: {
                    fontSize: theme('fontSize.2xl.0'),
                  },
                },
                'h4, h5, h6': {
                  fontSize: theme('fontSize.lg.0'),
                  marginTop: theme('spacing.10'),
                  [`@media (min-width: ${theme('screens.lg')})`]: {
                    fontSize: theme('fontSize.xl.0'),
                  },
                },
                img: {
                  borderRadius: theme('borderRadius.lg'),
                  // images are wrapped in <p>, which already has margin
                  marginTop: 0,
                  marginBottom: 0,
                },
                blockquote: {
                  color: theme('colors.gray.800'),
                  fontWeight: theme('fontWeight.normal'),
                },
                'blockquote > p:first-child': {
                  marginTop: 0,
                },
              },
            ],
          },
          dark: {
            css: [
              {
                color: theme('colors.blueGray.500'),

                a: {
                  color: theme('colors.white'),
                },
                strong: {
                  color: theme('colors.white'),
                },
                code: {
                  color: theme('colors.gray.100'),
                },
                'h1, h2, h3, h4, h5, h6': {
                  color: theme('colors.white'),
                },
                blockquote: {
                  color: theme('colors.blueGray.500'),
                },
              },
            ],
          },
        }
      },
    },
  },
  purge: {
    mode: 'layers',
    enabled: process.env.NODE_ENV === 'production',
    content: [fromRoot('./app/**/*.+(js|ts|tsx|mdx|md)')],
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
