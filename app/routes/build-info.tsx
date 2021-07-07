import * as React from 'react'

export default function BuildInfo() {
  return (
    <div>
      ready
      <ul>
        <ol>Commit SHA: {ENV.COMMIT_SHA}</ol>
      </ul>
    </div>
  )
}
