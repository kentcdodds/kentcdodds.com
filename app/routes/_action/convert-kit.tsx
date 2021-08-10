import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {handleConvertKitFormSubmission} from '../../convertkit/remix.server'

export const action: ActionFunction = async ({request}) => {
  return handleConvertKitFormSubmission(request)
}

export const loader = () => redirect('/', {status: 404})

export default function ConvertKit() {
  return <div>Oops... You should not see this.</div>
}
