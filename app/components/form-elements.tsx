import * as React from 'react'
import clsx from 'clsx'

function Label({className, ...labelProps}: JSX.IntrinsicElements['label']) {
  return (
    <label
      {...labelProps}
      className={clsx(
        'inline-block text-lg text-gray-500 dark:text-slate-500',
        className,
      )}
    />
  )
}

type InputProps =
  | ({type: 'textarea'} & JSX.IntrinsicElements['textarea'])
  | JSX.IntrinsicElements['input']

export const inputClassName =
  'placeholder-gray-500 dark:disabled:text-slate-500 focus-ring px-11 py-8 w-full text-black disabled:text-gray-400 dark:text-white text-lg font-medium bg-gray-100 dark:bg-gray-800 rounded-lg'
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  props,
  ref,
) {
  const className = clsx(inputClassName, props.className)

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
      ref={ref}
    />
  )
})

interface InputErrorProps {
  id: string
  children?: string | null
}

function InputError({children, id}: InputErrorProps) {
  if (!children) {
    return null
  }

  return (
    <p role="alert" id={id} className="text-sm text-red-500">
      {children}
    </p>
  )
}

const Field = React.forwardRef<
  HTMLInputElement,
  {
    defaultValue?: string | null
    name: string
    label: string
    className?: string
    error?: string | null
    description?: React.ReactNode
  } & InputProps
>(function Field(
  {defaultValue, error, name, label, className, description, id, ...props},
  ref,
) {
  return (
    <FieldContainer
      id={id}
      label={label}
      className={className}
      error={error}
      description={description}
    >
      {({inputProps}) => (
        <Input
          // @ts-expect-error no idea 🤷‍♂️
          ref={ref}
          required
          {...props}
          {...inputProps}
          name={name}
          autoComplete={name}
          defaultValue={defaultValue}
        />
      )}
    </FieldContainer>
  )
})

type FieldContainerRenderProp = (props: {
  inputProps: {
    id: string
    'aria-describedby'?: string
  }
}) => React.ReactNode

export function FieldContainer({
  error,
  label,
  className,
  description,
  id,
  children,
}: {
  id?: string
  label: string
  className?: string
  error?: string | null
  description?: React.ReactNode
  children: FieldContainerRenderProp
}) {
  const defaultId = React.useId()
  const inputId = id ?? defaultId
  const errorId = `${inputId}-error`
  const descriptionId = `${inputId}-description`

  return (
    <div className={clsx('mb-8', className)}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        {error ? (
          <InputError id={errorId}>{error}</InputError>
        ) : description ? (
          <div id={descriptionId} className="text-primary text-lg">
            {description}
          </div>
        ) : null}
      </div>

      {children({
        inputProps: {
          id: inputId,
          'aria-describedby': error
            ? errorId
            : description
            ? descriptionId
            : undefined,
        },
      })}
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
      <div className="absolute inset-0 rounded-lg bg-red-500 opacity-25" />
      <div className="text-primary relative text-lg font-medium">
        {children}
      </div>
    </div>
  )
}

export {Label, Input, InputError, Field, ButtonGroup, ErrorPanel}
