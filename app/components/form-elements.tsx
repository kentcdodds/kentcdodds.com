import * as React from 'react'
import clsx from 'clsx'
import {useId} from '@reach/auto-id'

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

type InputProps =
  | ({type: 'textarea'} & JSX.IntrinsicElements['textarea'])
  | JSX.IntrinsicElements['input']

function Input(props: InputProps) {
  const className = clsx(
    'placeholder-gray-500 dark:disabled:text-blueGray-500 focus-ring px-11 py-8 w-full text-black disabled:text-gray-400 dark:text-white text-lg font-medium bg-gray-100 dark:bg-gray-800 rounded-lg',
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

function Field({
  defaultValue,
  error,
  name,
  label,
  className,
  description,
  id,
  ...props
}: {
  defaultValue?: string | null
  name: string
  label: string
  className?: string
  error?: string | null
  description?: React.ReactNode
} & InputProps) {
  const prefix = useId()
  const inputId = id ?? `${prefix}-${name}`
  const errorId = `${inputId}-error`
  const descriptionId = `${inputId}-description`

  return (
    <div className={clsx('mb-8', className)}>
      <div className="flex items-baseline justify-between mb-4">
        <Label htmlFor={inputId}>{label}</Label>
        {error ? (
          <InputError id={errorId}>{error}</InputError>
        ) : description ? (
          <div id={descriptionId} className="text-primary text-lg">
            {description}
          </div>
        ) : null}
      </div>

      <Input
        {...(props as InputProps)}
        name={name}
        id={inputId}
        autoComplete={name}
        required
        defaultValue={defaultValue}
        aria-describedby={
          error ? errorId : description ? descriptionId : undefined
        }
      />
    </div>
  )
}

function ButtonGroup({
  children,
}: {
  children: React.ReactNode | React.ReactNode[]
}) {
  return (
    <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
      {children}
    </div>
  )
}

function ErrorPanel({children, id}: {children: React.ReactNode; id?: string}) {
  return (
    <div role="alert" className="relative mt-8 px-11 py-8" id={id}>
      <div className="absolute inset-0 bg-red-500 rounded-lg opacity-25" />
      <div className="text-primary relative text-lg font-medium">
        {children}
      </div>
    </div>
  )
}

export {Label, Input, InputError, Field, ButtonGroup, ErrorPanel}
