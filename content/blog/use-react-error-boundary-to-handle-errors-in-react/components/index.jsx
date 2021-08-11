import * as React from 'react'

export {App as BoundaryApp} from './boundary.jsx'
export {App as TryCatchApp} from './try-catch.jsx'
export {App as RecoveryApp} from './recovery.jsx'

function Layout(props) {
  return (
    <div
      style={{
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        marginBottom: 20,
        minHeight: 900,
      }}
      {...props}
    />
  )
}

export {Layout}
