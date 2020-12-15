import * as React from 'react'

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

export {useSSRLayoutEffect}
