import * as React from 'react'
import clsx from 'clsx'
import {useSSRLayoutEffect} from '~/utils/misc'

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

  // make this happen asap
  // if it's alrady loaded, don't bother fading it in.
  useSSRLayoutEffect(() => {
    if (imgRef.current?.complete) setVisible(true)
  }, [])

  React.useEffect(() => {
    if (!imgRef.current) return
    if (imgRef.current.complete) return

    let current = true
    imgRef.current.addEventListener('load', () => {
      if (!imgRef.current || !current) return
      setTimeout(() => {
        setVisible(true)
      }, 0)
    })

    return () => {
      current = false
    }
  }, [])

  const imgEl = React.cloneElement(img, {
    // @ts-expect-error no idea 🤷‍♂️
    ref: imgRef,
    key: img.props.src,
    className: img.props.className,
  })

  const blurEl = (
    <img
      key={blurDataUrl}
      src={blurDataUrl}
      className={imgEl.props.className}
    />
  )

  const jsImgEl = React.cloneElement(imgEl, {
    key: `${img.props.src}-js`,
    className: clsx(imgEl.props.className, 'z-10 transition-opacity', {
      'opacity-0': !visible,
    }),
  })

  return (
    <div className={rest.className} {...rest}>
      {jsImgEl}
      <noscript>{imgEl}</noscript>
      {blurDataUrl ? (
        <>
          {blurEl}
          <div className={clsx(imgEl.props.className, 'backdrop-blur-xl')} />
        </>
      ) : null}
    </div>
  )
}

export {BlurrableImage}
