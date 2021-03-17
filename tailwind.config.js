const path = require('path')

// this file gets copied to the storybook directory
// so to make sure we're pointing to the right files
// we use this to do full path references based on
// the project root.
const dir = __dirname.endsWith('storybook')
  ? path.dirname(__dirname)
  : __dirname

const fromRoot = p => path.join(dir, p)

module.exports = {
  darkMode: 'class',
  variants: {
    opacity: ['responsive', 'hover', 'focus', 'dark'],
    boxShadow: ['responsive', 'hover', 'focus', 'dark'],
  },
  purge: {
    mode: 'layers',
    content: [fromRoot('./app/**/*.+(js|ts|tsx|mdx|md)')],
  },
  plugins: [require('@tailwindcss/typography')],
}
