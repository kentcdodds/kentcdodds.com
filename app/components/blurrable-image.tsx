import * as React from 'react'
import clsx from 'clsx'

function BlurrableImage({
  img,
  blurDataUrl,
  ...rest
}: {
  img: React.ReactElement<React.ImgHTMLAttributes<HTMLImageElement>>
  blurDataUrl?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const [visible, setVisible] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const {src, srcSet, sizes} = img.props

  React.useEffect(() => {
    let current = true
    if (!imgRef.current) return
    if (imgRef.current.complete) {
      setVisible(true)
      return
    }

    imgRef.current.addEventListener('load', () => {
      if (!imgRef.current || !current) return
      setTimeout(() => {
        setVisible(true)
      }, 150)
    })

    return () => {
      current = false
    }
  }, [src, srcSet, sizes])

  const imgEl = React.cloneElement(img, {
    // @ts-expect-error no idea 🤷‍♂️
    ref: imgRef,
    key: img.props.src,
    className: clsx(
      img.props.className,
      'z-10 w-full h-full object-cover transition-opacity',
      {'opacity-0': !visible},
    ),
  })

  return (
    <div
      className={clsx(rest.className, 'w-full h-full')}
      style={
        blurDataUrl
          ? {
              ...rest.style,
              backgroundImage: `url("${blurDataUrl}")`,
              backgroundSize: 'cover',
            }
          : rest.style
      }
    >
      {imgEl}
      <noscript className="z-10">{imgEl}</noscript>
      {blurDataUrl ? (
        <div className="w-full h-full rounded-lg backdrop-blur-xl" />
      ) : null}
    </div>
  )
}

export {BlurrableImage}
