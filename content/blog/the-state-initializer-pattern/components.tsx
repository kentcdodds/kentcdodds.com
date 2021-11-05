import * as React from 'react'

function SimpleCounter() {
  const [count, setCount] = React.useState(0)
  const increment = () => setCount(c => c + 1)
  const reset = () => setCount(0)
  return <CountUI count={count} increment={increment} reset={reset} />
}

function InitialCounterAlmostThere({
  initialCount = 0,
}: {
  initialCount?: number
}) {
  const [count, setCount] = React.useState(initialCount)
  const increment = () => setCount(c => c + 1)
  const reset = () => setCount(initialCount)
  return <CountUI count={count} increment={increment} reset={reset} />
}

function BugReproduced() {
  const [initialCount, setInitialCount] = React.useState(3)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setInitialCount(Math.floor(Math.random() * 50))
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [])
  return <InitialCounterAlmostThere initialCount={initialCount} />
}

function FinishedCounter({initialCount = 0}: {initialCount?: number}) {
  const {current: initialState} = React.useRef({count: initialCount})
  const [count, setCount] = React.useState(initialState.count)
  const increment = () => setCount(c => c + 1)
  const reset = () => setCount(initialState.count)
  return <CountUI count={count} increment={increment} reset={reset} />
}

function KeyPropReset() {
  const [key, setKey] = React.useState(0)
  const resetCounter = () => setKey(k => k + 1)
  return <KeyPropResetCounter key={key} reset={resetCounter} />
}

function KeyPropResetCounter({reset}: {reset: () => void}) {
  const [count, setCount] = React.useState(0)
  const increment = () => setCount(c => c + 1)
  return <CountUI count={count} increment={increment} reset={reset} />
}

function CountUI({
  count,
  increment,
  reset,
}: {
  count: number
  increment: () => void
  reset: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        flexDirection: 'column',
        maxWidth: '5rem',
      }}
    >
      <button style={{flex: 1}} onClick={increment}>
        {count}
      </button>
      <button style={{flex: 1}} onClick={reset}>
        Reset
      </button>
    </div>
  )
}

export {
  SimpleCounter,
  InitialCounterAlmostThere,
  BugReproduced,
  FinishedCounter,
  KeyPropReset,
}
