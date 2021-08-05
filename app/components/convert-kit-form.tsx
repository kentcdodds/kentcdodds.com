import * as React from 'react'
import {Form} from 'remix'
import {useOptionalUser} from '../utils/providers'
import {ArrowButton} from './arrow-button'

function ConvertKitForm() {
  const user = useOptionalUser()
  return (
    <Form
      className="mt-8 space-y-4"
      method="post"
      action="TODO: set up action for newsletter"
    >
      <input
        name="firstName"
        defaultValue={user?.firstName}
        readOnly={Boolean(user?.firstName)}
        autoComplete="name"
        type="text"
        placeholder="First name"
        aria-label="First name"
        className="border-secondary hover:border-primary focus:border-primary focus:bg-secondary px-8 py-6 w-full dark:text-white bg-transparent border rounded-lg focus:outline-none"
      />
      <input
        name="email"
        defaultValue={user?.email}
        readOnly={Boolean(user?.email)}
        type="email"
        autoComplete="email"
        placeholder="email"
        aria-label="email"
        className="border-secondary hover:border-primary focus:border-primary focus:bg-secondary px-8 py-6 w-full dark:text-white bg-transparent border rounded-lg focus:outline-none"
      />

      <ArrowButton className="pt-4" type="submit" direction="right">
        Sign me up
      </ArrowButton>
    </Form>
  )
}

export {ConvertKitForm}
