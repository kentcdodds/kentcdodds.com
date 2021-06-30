import * as React from 'react'

class UsernameFormClass extends React.Component {
  state = {status: 'idle', error: null}
  handleSubmit = async event => {
    event.preventDefault()
    const newUsername = event.target.elements.username.value
    this.setState({status: 'pending'})
    try {
      await this.props.updateUsername(newUsername)
      this.setState({status: 'fulfilled'})
    } catch (e) {
      this.setState({status: 'rejected', error: e})
    }
  }
  render() {
    const {error, status} = this.state

    return (
      <form onSubmit={this.handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" />
        </div>
        <button type="submit">Submit</button>
        <span>{status === 'pending' ? 'Saving...' : null}</span>
        <span>{status === 'rejected' ? error.message : null}</span>
      </form>
    )
  }
}

class UsernameFormClassWithBug extends React.Component {
  state = {status: 'idle', error: null}
  handleSubmit = async event => {
    event.preventDefault()
    const newUsername = event.target.elements.username.value
    this.setState({status: 'pending'})
    try {
      await this.props.updateUsername(newUsername)
      // this.setState({status: 'fulfilled'})
    } catch (e) {
      this.setState({status: 'rejected', error: e})
    }
  }
  render() {
    const {error, status} = this.state

    return (
      <form onSubmit={this.handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" />
        </div>
        <button type="submit">Submit</button>
        <span>{status === 'pending' ? 'Saving...' : null}</span>
        <span>{status === 'rejected' ? error.message : null}</span>
      </form>
    )
  }
}

function UsernameForm({updateUsername}) {
  const [{status, error}, setState] = React.useState({
    status: 'idle',
    error: null,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const newUsername = event.target.elements.username.value
    setState({status: 'pending'})
    try {
      await updateUsername(newUsername)
      setState({status: 'fulfilled'})
    } catch (e) {
      setState({status: 'rejected', error: e})
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="username">Username</label>
        <input id="username" />
      </div>
      <button type="submit">Submit</button>
      <span>{status === 'pending' ? 'Saving...' : null}</span>
      <span>{status === 'rejected' ? error.message : null}</span>
    </form>
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

export {UsernameForm, UsernameFormClass, UsernameFormClassWithBug, Rendered}
