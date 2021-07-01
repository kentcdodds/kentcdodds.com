import * as React from 'react'

function Label(props: JSX.IntrinsicElements['label']) {
  return (
    <label
      {...props}
      className="inline-block dark:text-blueGray-500 text-gray-500 text-lg"
    />
  )
}

function Input(props: JSX.IntrinsicElements['input']) {
  return (
    <input
      {...props}
      className="placeholder-gray-500 px-11 py-8 w-full text-black dark:text-white text-lg font-medium bg-gray-200 dark:bg-gray-800 rounded-lg focus:outline-none ring-yellow-500 dark:ring-offset-gray-900 ring-offset-white ring-offset-4 focus:ring-2"
    />
  )
}

interface InputErrorProps {
  id: string
  children?: string
}

function InputError({children, id}: InputErrorProps) {
  if (!children) {
    return null
  }

  return (
    <p id={id} className="text-red-500 text-sm">
      {children}
    </p>
  )
}

export {Label, Input, InputError}
