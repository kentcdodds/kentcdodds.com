import * as React from 'react'
import clsx from 'clsx'

interface TagProps {
  tag: string
  selected?: boolean
}

function Tag({tag, selected}: TagProps) {
  // TODO: didn't know the behavior of these tags, and thereby if they should be a <button>, <Link> or @reach/checkbox
  // TODO: add aria-checked || aria-selected ?
  return (
    <div
      key={tag}
      className={clsx('ml-4 mt-4 px-6 py-3 rounded-full transition', {
        'text-black dark:text-white bg-gray-100 dark:bg-gray-800': !selected,
        'text-white dark:text-black bg-gray-800 dark:bg-gray-100': selected,
      })}
    >
      {tag}
    </div>
  )
}

export {Tag}
