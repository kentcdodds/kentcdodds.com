import * as React from 'react'

interface ResponsiveImageProps {
  src: string
  alt: string
}

function ResponsiveImage({src, alt}: ResponsiveImageProps) {
  return (
    <div className="relative w-full h-full">
      {/* aspect ratio - aligned top */}
      <div className="aspect-h-6 aspect-w-4">
        <img className="rounded-lg object-cover" src={src} alt={alt} />
      </div>
    </div>
  )
}

export {ResponsiveImage}
