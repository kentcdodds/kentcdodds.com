import * as React from 'react'
import {Link} from 'react-router-dom'

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

function AnchorOrLink(props: AnchorProps) {
  const {href = '', ...rest} = props
  if (href.startsWith('http')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...props} />
  } else {
    // @ts-expect-error I'm not sure what to do about extra props other than to forward them
    return <Link to={href} {...rest} />
  }
}

type Status = 'idle' | 'pending' | 'rejected' | 'resolved'
function useAsync<Data>(
  initialState: {
    status?: Status
    data?: Data | null
    error?: Error | null
  } = {},
) {
  type AsyncState = Required<typeof initialState>
  type Action = Partial<AsyncState>

  const latestRef = React.useRef<number>(1)
  const initialStateRef = React.useRef<AsyncState>({
    status: 'idle',
    data: null,
    error: null,
    ...initialState,
  })
  const [{status, data, error}, setState] = React.useReducer(
    (s: AsyncState, a: Action) => ({...s, ...a}),
    initialStateRef.current,
  )

  const safeSetState = useSafeDispatch(setState)

  const setData = React.useCallback(
    (data: Data) => safeSetState({data, status: 'resolved'}),
    [safeSetState],
  )
  const setError = React.useCallback(
    (error: Error) => safeSetState({error, status: 'rejected'}),
    [safeSetState],
  )
  const reset = React.useCallback(() => safeSetState(initialStateRef.current), [
    safeSetState,
  ])

  const run = React.useCallback(
    (promise: Promise<Data>) => {
      const id = latestRef.current++
      safeSetState({status: 'pending'})
      return promise.then(
        data => {
          if (id === latestRef.current) setData(data)
          return data
        },
        (error: Error) => {
          if (id === latestRef.current) setError(error)
          return Promise.reject(error)
        },
      )
    },
    [safeSetState, setData, setError],
  )

  return {
    isIdle: status === 'idle',
    isLoading: status === 'pending',
    isError: status === 'rejected',
    isSuccess: status === 'resolved',

    setData,
    setError,
    error,
    status,
    data,
    run,
    reset,
  }
}

function useSafeDispatch<Action>(
  dispatch: (action: Action) => void,
): typeof dispatch {
  const mounted = React.useRef(false)
  useSSRLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return React.useCallback(
    action => {
      if (mounted.current) dispatch(action)
    },
    [dispatch],
  )
}

export {useSSRLayoutEffect, AnchorOrLink, useAsync}

/*
eslint
  @typescript-eslint/no-shadow: "off",
*/
