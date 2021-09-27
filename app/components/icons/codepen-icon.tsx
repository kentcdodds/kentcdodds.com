import * as React from 'react'

function CodepenIcon({
  size = 24,
  title = 'Codepen',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M12.15 24.29a1.14 1.14 0 01-.65-.2l-11-7.28a.91.91 0 01-.32-.3v-.05a1.24 1.24 0 01-.18-.64V8.45a1.23 1.23 0 01.18-.63v-.06a1 1 0 01.32-.29l11-7.28a1.22 1.22 0 011.3 0l11 7.28a1 1 0 01.32.29.1.1 0 010 .05 1.23 1.23 0 01.18.63v7.37a1.24 1.24 0 01-.18.64v.05a1 1 0 01-.32.3l-11 7.28a1.14 1.14 0 01-.65.21zm1.15-7.84V21l7.78-5.17-3.43-2.31zm-10.08-.62L11 21v-4.55l-4.35-2.93zm5.49-3.69l3.44 2.31 3.44-2.31-3.44-2.32zm11 0L22 13.68V10.6zM2.3 10.6v3.08l2.29-1.54zm11-2.77l4.35 2.92 3.43-2.3-7.78-5.17zm-10.08.62l3.43 2.3L11 7.83V3.28z"
        fill="currentColor"
      />
    </svg>
  )
}

export {CodepenIcon}
