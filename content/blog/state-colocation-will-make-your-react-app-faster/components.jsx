import * as React from 'react'

function sleep(time) {
  const done = Date.now() + time
  while (done > Date.now()) {
    // sleep...
  }
}

// imagine that this slow component is actually slow because it's rendering a
// lot of data (for example).
function SlowComponent({time, onChange}) {
  sleep(time)
  return (
    <div>
      Wow, that was{' '}
      <input
        aria-label="time in milliseconds"
        value={time}
        type="number"
        min="0"
        max="3000"
        onChange={e => onChange(Number(e.target.value))}
      />
      {'ms slow'}
    </div>
  )
}

function DogName({time, dog, onChange}) {
  return (
    <div>
      <label htmlFor="dog">Dog Name</label>
      <br />
      <input id="dog" value={dog} onChange={e => onChange(e.target.value)} />
      <p>{dog ? `${dog}'s favorite number is ${time}.` : 'enter a dog name'}</p>
    </div>
  )
}

function App() {
  // this is "global state"
  const [dog, setDog] = React.useState('')
  const [time, setTime] = React.useState(200)
  return (
    <div>
      <DogName time={time} dog={dog} onChange={setDog} />
      <SlowComponent time={time} onChange={setTime} />
    </div>
  )
}

function FastDogName({time}) {
  const [dog, setDog] = React.useState('')
  return (
    <div>
      <label htmlFor="dog">Dog Name</label>
      <br />
      <input id="dog" value={dog} onChange={e => setDog(e.target.value)} />
      <p>{dog ? `${dog}'s favorite number is ${time}.` : 'enter a dog name'}</p>
    </div>
  )
}

function FastApp() {
  // this is "global state"
  const [time, setTime] = React.useState(200)
  return (
    <div>
      <FastDogName time={time} />
      <SlowComponent time={time} onChange={setTime} />
    </div>
  )
}

function Layout(props) {
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

export {App, FastApp, Layout}
