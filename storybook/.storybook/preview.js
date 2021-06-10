import '@kcd/styles/app.css'
import '@kcd/styles/tailwind.css'
import './storybook.css'

export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  darkMode: {
    current: 'dark',
    darkClass: 'dark',
    lightClass: 'light',
    classTarget: 'body',
    stylePreview: true,
  },
}
