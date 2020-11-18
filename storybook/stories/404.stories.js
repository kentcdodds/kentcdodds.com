import * as React from 'react'
import FourOhFour from '../../app/routes/404'

export default {
  title: '404',
  component: FourOhFour,
}
const Template = args => <FourOhFour {...args} />

export const Main = Template.bind({})
Main.args = {}
Main.routeData = {fakeFourOhFor: true}
