import '@kcd/styles/app.css'
import '@kcd/styles/tailwind.css'
import './storybook.css'
import {addDecorator} from '@storybook/react'
import {createMemoryHistory} from 'history'
import {MemoryRouter, Router, Route} from 'react-router-dom'

addDecorator(story => {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Route path="/" element={story()} />
    </MemoryRouter>
  )
})

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
