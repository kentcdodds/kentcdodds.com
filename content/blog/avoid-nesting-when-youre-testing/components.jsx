import * as React from 'react'

function Login({onSubmit}) {
  const [error, setError] = React.useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const {
      usernameInput: {value: username},
      passwordInput: {value: password},
    } = event.target.elements

    if (!username) {
      setError('username is required')
    } else if (!password) {
      setError('password is required')
    } else {
      setError('')
      onSubmit({username, password})
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="usernameInput">Username</label>
          <input id="usernameInput" />
        </div>
        <div>
          <label htmlFor="passwordInput">Password</label>
          <input id="passwordInput" type="password" />
        </div>
        <button type="submit">Submit</button>
      </form>
      {error ? <div role="alert">{error}</div> : null}
    </div>
  )
}

export {Login}

/* eslint no-negated-condition:0 */
