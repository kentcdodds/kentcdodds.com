import {markdownToHtmlDocument} from './markdown.server'

let mailgunDomain = 'mg.example.com'
if (process.env.MAILGUN_DOMAIN) {
  mailgunDomain = process.env.MAILGUN_DOMAIN
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('MAILGUN_DOMAIN is required')
}
let mailgunSendingKey = 'example_send_key'
if (process.env.MAILGUN_SENDING_KEY) {
  mailgunSendingKey = process.env.MAILGUN_SENDING_KEY
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('MAILGUN_SENDING_KEY is required')
}

type MailgunMessage = {
  to: string
  from: string
  subject: string
  text: string
  html?: string | null
}

async function sendEmail({to, from, subject, text, html}: MailgunMessage) {
  const auth = `${Buffer.from(`api:${mailgunSendingKey}`).toString('base64')}`

  // if they didn't specify it and it's not
  if (html === undefined) {
    html = await markdownToHtmlDocument(text)
  } else if (html === null) {
    html = text
  }

  const body = new URLSearchParams({
    to,
    from,
    subject,
    text,
    html,
  })

  await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
    method: 'post',
    body,
    headers: {
      Authorization: `Basic ${auth}`,
    },
  })
}

async function sendMagicLinkEmail({
  emailAddress,
  confirmationLink,
  userExists,
}: {
  emailAddress: string
  confirmationLink: string
  userExists: boolean
}) {
  const sender = `"Kent C. Dodds Team" <team@kentcdodds.com>`

  const body = `
Here's your sign-in link for kentcdodds.com:

${confirmationLink}

${
  userExists
    ? `Welcome back ${emailAddress}!`
    : `
Clicking the link above will create a *new* account on kentcdodds.com with the email ${emailAddress}. Welcome!
If you'd instead like to change your email address for an existing account, please send an email to team+email-change@kentcdodds.com from the original email address.
      `.trim()
}

Thanks!

– The KCD Team

P.S. If you did not request this email, you can safely ignore it.
  `.trim()

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Here's your Magic ✨ sign-in link for kentcdodds.com`,
    text: body,
    html: await markdownToHtmlDocument(body),
  }

  await sendEmail(message)
}

export {sendEmail, sendMagicLinkEmail}

/*
eslint
  max-statements: "off",
*/
