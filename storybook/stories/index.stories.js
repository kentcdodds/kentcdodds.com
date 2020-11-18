import * as React from 'react'
import Index from '../../app/routes/index'

export default {
  title: 'Index',
  component: Index,
}
const Template = args => <Index {...args} />

export const Home = Template.bind({})
Home.args = {}
Home.routeData = [
  {
    id: 'mock-1',
    title: 'Mock post 1',
    content: '<p>This is an <em>example</em>.</p>',
    author: 'Mock Author',
    createdDate: 1604809560963,
    category: 'mock',
  },
]
