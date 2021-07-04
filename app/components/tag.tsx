import * as React from 'react'
import clsx from 'clsx'
import type {ChangeEventHandler} from 'react'
import {CustomCheckboxContainer, CustomCheckboxInput} from '@reach/checkbox'

interface TagProps {
  tag: string
  selected: boolean
  onClick?: ChangeEventHandler<HTMLInputElement>
}

function Tag({tag, selected, onClick}: TagProps) {
  return (
    <label>
      <CustomCheckboxContainer
        checked={selected}
        onChange={onClick}
        className={clsx(
          'focus-ring relative block mb-4 mr-4 px-6 py-3 w-auto h-auto rounded-full',
          {
            'text-black dark:text-white bg-gray-100 dark:bg-gray-800':
              !selected,
            'text-white dark:text-black bg-gray-800 dark:bg-gray-100': selected,
          },
        )}
      >
        <CustomCheckboxInput
          checked={selected}
          value={tag}
          className="sr-only"
        />
        <span>{tag}</span>
      </CustomCheckboxContainer>
    </label>
  )
}

export {Tag}
