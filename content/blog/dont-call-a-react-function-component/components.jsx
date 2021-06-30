import * as React from 'react'
import {ErrorBoundary} from 'react-error-boundary'

function Counter() {
  const [count, setCount] = React.useState(0)
  const increment = () => setCount(c => c + 1)
  return <button onClick={increment}>{count}</button>
}

function BadCounterList() {
  const [items, setItems] = React.useState([])
  const addItem = () => setItems(i => [...i, {id: i.length}])
  return (
    <div>
      <button onClick={addItem}>Add Item</button>
      <div>{items.map(Counter)}</div>
    </div>
  )
}

function GoodCounterList() {
  const [items, setItems] = React.useState([])
  const addItem = () => setItems(i => [...i, {id: i.length}])
  return (
    <div>
      <button onClick={addItem}>Add Item</button>
      <div>
        {items.map(i => (
          <Counter key={i.id} />
        ))}
      </div>
    </div>
  )
}

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div>
      <div>Oh no, there was an error. Check the console for more info.</div>
      <div>
        <pre style={{color: 'rgb(214, 222, 235)'}}>{error.message}</pre>
      </div>
      <button onClick={resetErrorBoundary}>Reset</button>
    </div>
  )
}

function BadApp() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BadCounterList />
    </ErrorBoundary>
  )
}

function GoodApp() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GoodCounterList />
    </ErrorBoundary>
  )
}

function Rendered(props) {
  return (
    <div
      style={{
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        marginBottom: 20,
      }}
      {...props}
    />
  )
}

export {BadApp, GoodApp, Rendered}
