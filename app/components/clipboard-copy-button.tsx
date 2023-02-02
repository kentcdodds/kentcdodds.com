import clsx from 'clsx'
import * as React from 'react'
import {CheckIcon, CopyIcon} from './icons'

async function copyToClipboard(value: string) {
  try {
    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(value)
      return true
    }

    const element = document.createElement('textarea')
    element.value = value
    document.body.append(element)
    element.select()
    document.execCommand('copy')
    element.remove()

    return true
  } catch {
    return false
  }
}

interface ClipboardCopyButtonProps {
  value: string
  className?: string
  variant?: 'responsive' | 'icon'
}

enum State {
  Idle = 'idle',
  Copy = 'copy',
  Copied = 'copied',
}

function ClipboardCopyButton({
  value,
  className,
  variant = 'responsive',
}: ClipboardCopyButtonProps) {
  const [state, setState] = React.useState<State>(State.Idle)

  React.useEffect(() => {
    async function transition() {
      switch (state) {
        case State.Copy: {
          const res = await copyToClipboard(value)
          console.info('copied', res)
          setState(State.Copied)
          break
        }
        case State.Copied: {
          setTimeout(() => {
            setState(State.Idle)
          }, 2000)
          break
        }
        default:
          break
      }
    }
    void transition()
  }, [state, value])

  return (
    <button
      onClick={() => setState(State.Copy)}
      className={clsx(
        'whitespace-nowrap rounded-lg bg-white p-3 text-lg font-medium text-black shadow ring-team-current transition hover:opacity-100 hover:shadow-md hover:ring-4 focus:opacity-100 focus:outline-none focus:ring-4 group-hover:opacity-100 peer-hover:opacity-100 peer-focus:opacity-100 lg:opacity-0',
        {'lg:px-8 lg:py-4': variant === 'responsive'},
        className,
      )}
    >
      <span className={clsx('hidden', {'lg:inline': variant === 'responsive'})}>
        {state === State.Copied ? 'Copied to clipboard' : 'Click to copy url'}
      </span>
      <span className={clsx('inline', {'lg:hidden': variant === 'responsive'})}>
        {state === State.Copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  )
}

export {ClipboardCopyButton}
