import * as React from 'react'

function ErrorFallback({error}) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{color: 'red'}}>{error.message}</pre>
    </div>
  )
}

function App() {
  return (
    <div>
      {/* gatsby doesn't like error boundaries I guess */}
      <ErrorFallback
        error={{
          message: `TypeError: Cannot read property 'toUpperCase' of undefined`,
        }}
      />
    </div>
  )
}

export {App}
