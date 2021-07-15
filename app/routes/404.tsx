import * as React from 'react'
import {ErrorPage} from '../components/errors'

export function meta() {
  return {title: "Ain't nothing here"}
}

export default function NotFoundPage() {
  return (
    <ErrorPage
      title="404 - Oh no, how did you get here?"
      subtitle="This is not a page on kentcdodds.com. So sorry."
    />
  )
}
