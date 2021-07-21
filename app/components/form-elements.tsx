import * as React from 'react'
import clsx from 'clsx'

function Label({className, ...labelProps}: JSX.IntrinsicElements['label']) {
  return (
    <label
      {...labelProps}
      className={clsx(
        'inline-block dark:text-blueGray-500 text-gray-500 text-lg',
        className,
      )}
    />
  )
}

function Input(
  props:
    | ({type: 'textarea'} & JSX.IntrinsicElements['textarea'])
    | JSX.IntrinsicElements['input'],
) {
  const className = clsx(
    'placeholder-gray-500 dark:disabled:text-blueGray-500 focus-ring px-11 py-8 w-full text-black disabled:text-gray-400 dark:text-white text-lg font-medium bg-gray-200 dark:bg-gray-800 rounded-lg',
    props.className,
  )

  if (props.type === 'textarea') {
    return (
      <textarea
        {...(props as JSX.IntrinsicElements['textarea'])}
        className={className}
      />
    )
  }

  return (
    <input
      {...(props as JSX.IntrinsicElements['input'])}
      className={className}
    />
  )
}

interface InputErrorProps {
  id: string
  children?: string | null
}

function InputError({children, id}: InputErrorProps) {
  if (!children) {
    return null
  }

  return (
    <p role="alert" id={id} className="text-red-500 text-sm">
      {children}
    </p>
  )
}

export {Label, Input, InputError}
