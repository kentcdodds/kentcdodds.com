import * as React from 'react'
import {toCanvas as qrToCanvas} from 'qrcode'

function QRCode({text}: {text: string}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    void qrToCanvas(canvasRef.current, text)
  }, [text])
  return <canvas ref={canvasRef} />
}

// default export for code splitting
export default QRCode
