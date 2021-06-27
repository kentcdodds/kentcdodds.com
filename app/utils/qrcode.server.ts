import {toDataURL} from 'qrcode'

async function getQrCodeDataURL(text: string) {
  const dataUrl = await toDataURL(text, {scale: 6, margin: 2})
  return dataUrl
}

export {getQrCodeDataURL}
