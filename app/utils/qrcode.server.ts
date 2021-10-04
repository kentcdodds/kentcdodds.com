import {toDataURL} from 'qrcode'

async function getQrCodeDataURL(text: string) {
  const dataUrl = await toDataURL(text, {
    scale: 6,
    margin: 2,
    errorCorrectionLevel: 'low',
  })
  return dataUrl
}

export {getQrCodeDataURL}
