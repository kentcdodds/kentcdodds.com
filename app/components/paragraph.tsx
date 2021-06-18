import * as React from 'react'

interface ParagraphProps {
  children: string
}

function Paragraph({children}: ParagraphProps) {
  return (
    <p className="dark:text-blueGray-500 text-gray-500 text-lg">{children}</p>
  )
}

export {Paragraph}
