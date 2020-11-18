# [elaborate storybook](https://elaborate.netlify.app)

[![Netlify Status](https://api.netlify.com/api/v1/badges/0810f882-30ea-4448-b202-7717e680ddce/deploy-status)](https://app.netlify.com/sites/elaborate/deploys)

To run this storybook, you'll need to install dependencies in this directory.
Then run `npm run dev` to get the storybook running.

If the story you're working on uses `useRouteData` from `@remix-run/react`, then
you'll have to add `routeData` to your story. For example:

```javascript
import * as React from 'react'
// 👇 you must import the css file (if one exists) to get this route's CSS loaded
import '../../app/routes/index.css'
import Index from '../../app/routes/index'

export default {
  title: 'Index',
  component: Index,
}
const Template = args => <Index {...args} />

export const Home = Template.bind({})
Home.args = {}
// 👇 this is required if the component uses useRouteData:
Home.routeData = {fake: 'data'}
```

Whatever you set `routeData` to will be the value of `data` returned by
`useRouteData`. This should allow you to easily develop without having to
install remix.

For `useGlobalData`, it must expose `globalData`. For `useLocationPending` it's
`locationPending`.

Oh, and another thing, this `package.json` must include all dependencies used by
the stories because none of those dependencies will be installed in the root
directory by people who don't have remix licenses.
