import * as React from 'react'
import {render, screen, act} from '@testing-library/react'
import {checkStatus} from '../api'

function OrderStatus({orderId}) {
  const [{status, data, error}, setState] = React.useReducer(
    (s, a) => ({...s, ...a}),
    {status: 'idle', data: null, error: null},
  )
  React.useEffect(() => {
    let current = true
    function tick() {
      setState({status: 'pending'})
      checkStatus(orderId).then(
        d => {
          if (current) setState({status: 'fulfilled', data: d})
        },
        e => {
          if (current) setState({status: 'rejected', error: e})
        },
      )
    }
    const id = setInterval(tick, 1000)
    return () => {
      current = false
      clearInterval(id)
    }
  }, [orderId])

  return (
    <div>
      Order Status:{' '}
      <span>
        {status === 'idle' || status === 'pending'
          ? '...'
          : status === 'error'
          ? error.message
          : status === 'fulfilled'
          ? data.orderStatus
          : null}
      </span>
    </div>
  )
}

jest.mock('../api')

beforeAll(() => {
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

test('polling backend on an interval', async () => {
  const orderId = 'abc123'
  const orderStatus = 'Order Received'
  checkStatus.mockResolvedValue({orderStatus})

  render(<OrderStatus orderId={orderId} />)

  expect(screen.getByText(/\.\.\./i)).toBeInTheDocument()
  expect(checkStatus).toHaveBeenCalledTimes(0)

  act(() => jest.advanceTimersByTime(1000))

  expect(await screen.findByText(orderStatus)).toBeInTheDocument()

  expect(checkStatus).toHaveBeenCalledWith(orderId)
  expect(checkStatus).toHaveBeenCalledTimes(1)
})

/*
eslint
  no-console: "off"
*/
