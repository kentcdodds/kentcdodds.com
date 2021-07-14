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
    <CustomCheckboxContainer
      as="label"
      checked={selected}
      onChange={onClick}
      className={clsx(
        'focus-ring relative block mb-4 mr-4 px-6 py-3 w-auto h-auto rounded-full',
        {
          'text-primary bg-secondary': !selected,
          'text-inverse bg-inverse': selected,
        },
      )}
    >
      <CustomCheckboxInput checked={selected} value={tag} className="sr-only" />
      <span>{tag}</span>
    </CustomCheckboxContainer>
  )
}

export {Tag}
