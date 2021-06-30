import * as React from 'react'

const defaultValuesByTopic = {
  training: 'I would like some training',
  consulting: 'I have consulting needs',
  question: 'I have some questions',
}

function Label(props) {
  return <label style={{display: 'block', marginTop: '1rem'}} {...props} />
}

function WorkingContact() {
  const [topic, setTopic] = React.useState('training')

  return (
    <form>
      <div>
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          value={topic}
          style={{width: 300}}
          onChange={e => setTopic(e.target.value)}
        >
          <option value="training">Training</option>
          <option value="consulting">Consulting</option>
          <option value="question">Question</option>
        </select>
      </div>
      <div>
        <Label htmlFor="subject">Email Subject</Label>
        <input
          id="subject"
          key={topic}
          defaultValue={defaultValuesByTopic[topic]}
          style={{width: 300}}
        />
      </div>
      <div>
        <Label htmlFor="body">Email body</Label>
        <textarea id="body" style={{width: 300}} />
      </div>
    </form>
  )
}

function BrokenContact() {
  const [topic, setTopic] = React.useState('training')

  return (
    <form>
      <div>
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          value={topic}
          style={{width: 300}}
          onChange={e => setTopic(e.target.value)}
        >
          <option value="training">Training</option>
          <option value="consulting">Consulting</option>
          <option value="question">Question</option>
        </select>
      </div>
      <div>
        <Label htmlFor="subject">Email Subject</Label>
        <input
          id="subject"
          defaultValue={defaultValuesByTopic[topic]}
          style={{width: 300}}
        />
      </div>
      <div>
        <Label htmlFor="body">Email body</Label>
        <textarea id="body" style={{width: 300}} />
      </div>
    </form>
  )
}

function Counter() {
  const [count, setCount] = React.useState(() => {
    return 0
  })
  const increment = () => setCount(c => c + 1)

  React.useEffect(() => {
    return () => {}
  }, [])

  return <button onClick={increment}>{count}</button>
}

function CounterParent() {
  const [keyCounterKey, setKeyCounterKey] = React.useReducer(c => c + 1, 0)
  return (
    <div>
      <button style={{marginRight: 10}} onClick={setKeyCounterKey}>
        reset
      </button>
      <Counter key={keyCounterKey} />
    </div>
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

export {WorkingContact, BrokenContact, Rendered, CounterParent}

/*
eslint 
  jsx-a11y/label-has-associated-control: off,
  no-console: off
*/
