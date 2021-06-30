import * as React from 'react'

const sleep = t =>
  new Promise(resolve => {
    setTimeout(resolve, t)
  })

function DelayedCounterBug() {
  const [count, setCount] = React.useState(0)
  const increment = async () => {
    await sleep(500)
    setCount(count + 1)
  }
  return <button onClick={increment}>{count}</button>
}

function DelayedCounterWorking() {
  const [count, setCount] = React.useState(0)
  const increment = async () => {
    await sleep(500)
    setCount(previousCount => previousCount + 1)
  }
  return <button onClick={increment}>{count}</button>
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

export {DelayedCounterBug, DelayedCounterWorking, Rendered}
