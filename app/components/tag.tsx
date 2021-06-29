import * as React from 'react'
import clsx from 'clsx'
import type {MouseEventHandler} from 'react'

interface TagProps {
  tag: string
  selected?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

function Tag({tag, selected, onClick}: TagProps) {
  // TODO: make this accessible, aria-checked and aria-selected aren't allowed on buttons
  //   should we make it a checkbox with @reach/checkbox?
  return (
    <button
      key={tag}
      className={clsx('ml-4 mt-4 px-6 py-3 rounded-full transition', {
        'text-black dark:text-white bg-gray-100 dark:bg-gray-800': !selected,
        'text-white dark:text-black bg-gray-800 dark:bg-gray-100': selected,
      })}
      onClick={onClick}
    >
      {tag}
    </button>
  )
}

export {Tag}
