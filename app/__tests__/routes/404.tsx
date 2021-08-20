import * as React from 'react'
import {render, screen} from '@testing-library/react'
import FourOhFour from '~/routes/404'

// I never write tests like this. It's basically useless
// it's just here to make sure our testing setup works
test('Renders 404', () => {
  render(<FourOhFour />)
  expect(screen.getByRole('heading', {name: /404/})).toBeInTheDocument()
})
