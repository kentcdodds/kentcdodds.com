import {getRandomFlyingKody} from '~/images'
import type {User} from '~/types'
import {markdownToHtmlDocument} from './markdown.server'
import {getOptionalTeam} from './misc'

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
  magicLink,
  user,
  domainUrl,
}: {
  emailAddress: string
  magicLink: string
  user?: User | null
  domainUrl: string
}) {
  const sender = `"Kent C. Dodds Team" <team+kcd@kentcdodds.com>`
  const {hostname} = new URL(domainUrl)
  const userExists = Boolean(user)

  const randomSportyKody = getRandomFlyingKody(
    user ? getOptionalTeam(user.team) : undefined,
  )

  const text = `
Here's your sign-in link for ${hostname}:

${magicLink}

${
  userExists
    ? `Welcome back ${emailAddress}!`
    : `
Clicking the link above will create a *new* account on ${hostname} with the email ${emailAddress}. Welcome!
If you'd instead like to change your email address for an existing account, please send an email to team+email-change@kentcdodds.com from the original email address.
      `.trim()
}

Thanks!

– The KCD Team

P.S. If you did not request this email, you can safely ignore it.
  `.trim()

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <style type="text/css">
      @font-face {
        font-family: 'Matter';
        src: url('https://kcd-img.netlify.app/Matter-Medium.woff2') format('woff2'),
          url('https://kcd-img.netlify.app/Matter-Medium.woff') format('woff');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: 'Matter';
        src: url('https://kcd-img.netlify.app/Matter-Regular.woff2') format('woff2'),
          url('https://kcd-img.netlify.app/Matter-Regular.woff') format('woff');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    </style>
  </head>
  <body style="font-family:Matter, sans-serif;">
    <div style="margin: 0 auto; max-width: 450px;">

      <h2 style="text-align: center">${
        user
          ? `Hey ${user.firstName}! Welcome back to ${hostname}!`
          : `Hey ${emailAddress}! Welcome to ${hostname}`
      }</h2>

      <center><img src="https://res.cloudinary.com/kentcdodds-com/image/upload/w_800,q_auto,f_auto/${
        randomSportyKody.id
      }" style="max-width: 80%"></center>
      
      <h3 style="text-align: center">Click the button below to login to ${hostname}</h3>

      <a href="${magicLink}" style="display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black">
        ${userExists ? 'Login' : 'Create Account'}
      </a>

      <div style="text-align: center; margin-top: 1rem; font-size: .9rem">
        <div style="color: grey">This link is valid for 30 minutes.</div>
        <a href="${domainUrl}/login" style="margin-top: .4rem; display: block">Click here to request a new link.</a>
        <div style="color: grey">Be certain the link opens in the same browser you requested it from.</div>
      </div>
        
      <hr style="width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem">
        
      <div style="text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem">
        You received this because your email address was used to sign up for an account on
        <a href="${domainUrl}" style="color: grey">${hostname}</a>. If you didn't sign up for an account,
        feel free to disregard this email.
      </div>
    </div>
  </body>
</html>
  `

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Here's your Magic ✨ sign-in link for kentcdodds.com`,
    text,
    html,
  }

  await sendEmail(message)
}

export {sendEmail, sendMagicLinkEmail}

/*
eslint
  max-statements: "off",
*/
