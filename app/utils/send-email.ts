import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import getMailgunTransport from 'nodemailer-mailgun-transport'
import unified from 'unified'
import markdown from 'remark-parse'
import remark2rehype from 'remark-rehype'
import doc from 'rehype-document'
import format from 'rehype-format'
import html from 'rehype-stringify'

async function markdownToHtml(markdownString: string) {
  const {contents} = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(doc)
    .use(format)
    .use(html)
    .process(markdownString)

  return contents.toString()
}

let lazyTransporter: Mail
async function getTransporter(): Promise<Mail> {
  // eslint is confused about this...
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!lazyTransporter) {
    if (!process.env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY environment variable is not set')
    }
    if (!process.env.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_DOMAIN environment variable is not set')
    }

    const auth = {
      auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
      },
    }

    lazyTransporter = nodemailer.createTransport(getMailgunTransport(auth))
    await lazyTransporter.verify()
  }

  return lazyTransporter
}

async function sendEmail(message: Mail.Options) {
  const transporter = await getTransporter()
  await transporter.sendMail({
    html: message.html ?? (await markdownToHtml(String(message.text))),
    ...message,
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
    ? `
Clicking the link above will create a *new* account on kentcdodds.com with the email ${emailAddress}. Welcome!
If you'd instead like to change your email address for an existing account, please send an email to team+email-change@kentcdodds.com from the original email address.
      `.trim()
    : `Welcome back ${emailAddress}!`
}

Thanks!

– The KCD Team

P.S. If you did not sign up for an account on kentcdodds.com you can ignore this email.
  `.trim()

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Here's your Magic ✨ sign-in link for kentcdodds.com`,
    text: body,
    html: await markdownToHtml(body),
  }

  await sendEmail(message)
}

export {sendEmail, sendMagicLinkEmail}

/*
eslint
  max-statements: "off",
*/
