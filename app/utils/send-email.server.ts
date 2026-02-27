import { getImageBuilder, getRandomFlyingKody } from '#app/images.tsx'
import { getEnv } from '#app/utils/env.server.ts'
import { markdownToHtmlDocument } from './markdown.server.ts'
import { getOptionalTeam } from './misc.ts'

const {
	MAILGUN_DOMAIN: mailgunDomain,
	MAILGUN_SENDING_KEY: mailgunSendingKey,
	MAILGUN_API_BASE_URL: mailgunApiBaseUrl,
} = getEnv()

type MailgunMessage = {
	to: string
	from: string
	subject: string
	text: string
	html?: string | null
}

async function sendEmail({ to, from, subject, text, html }: MailgunMessage) {
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

	const url = new URL(`/v3/${mailgunDomain}/messages`, mailgunApiBaseUrl)
	await fetch(url.toString(), {
		method: 'POST',
		body,
		headers: {
			Authorization: `Basic ${auth}`,
		},
	})
}

async function sendVerificationCodeEmail({
	emailAddress,
	domainUrl,
	subject,
	title,
	verificationCode,
	verificationUrl,
	team,
}: {
	emailAddress: string
	domainUrl: string
	subject: string
	title: string
	verificationCode: string
	verificationUrl: string
	team?: string | null
}) {
	const sender = `"Kent C. Dodds Team" <team+kcd@kentcdodds.com>`
	const { hostname } = new URL(domainUrl)
	const randomSportyKody = getRandomFlyingKody(
		team ? getOptionalTeam(team) : undefined,
	)
	const randomSportyKodyImageUrl = getImageBuilder(randomSportyKody.id)({
		resize: { width: 800 },
		quality: 'auto',
		format: 'auto',
	})

	const text = `
${title} for ${hostname}

Verification code:
${verificationCode}

Or click this link:
${verificationUrl}

This code expires soon. If you did not request this email, you can safely ignore it.
`.trim()

	const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
  </head>
  <body style="font-family:ui-sans-serif, sans-serif;">
    <div style="margin: 0 auto; max-width: 450px;">
      <h2 style="text-align: center">${title}</h2>

      <div style="text-align: center; font-size: 1.1rem; margin-bottom: 1rem;">
        <div style="color: grey; font-size: .9rem; margin-bottom: .4rem;">Verification code</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 1.6rem; letter-spacing: .2rem; background: #f3f4f6; padding: .75rem 1rem; border-radius: 7px; display: inline-block;">
          ${verificationCode}
        </div>
      </div>

      <a href="${verificationUrl}" style="display: block; margin: 0 auto; width: 80%; padding: 1.2rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black">
        Continue on ${hostname}
      </a>

      <br />

      <center><img src="${randomSportyKodyImageUrl}" style="max-width: 80%;${
				randomSportyKody.style?.aspectRatio
					? `aspect-ratio: ${randomSportyKody.style.aspectRatio};`
					: ''
			}"></center>

      <hr style="width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem">

      <div style="text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem">
        You received this because your email address was used on
        <a href="${domainUrl}" style="color: grey">${hostname}</a>.
        If you didn't request this, you can disregard this email.
      </div>
    </div>
  </body>
</html>
`

	await sendEmail({
		from: sender,
		to: emailAddress,
		subject,
		text,
		html,
	})
}

async function sendSignupVerificationEmail({
	emailAddress,
	verificationCode,
	verificationUrl,
	domainUrl,
}: {
	emailAddress: string
	verificationCode: string
	verificationUrl: string
	domainUrl: string
}) {
	return sendVerificationCodeEmail({
		emailAddress,
		domainUrl,
		subject: `Your verification code for kentcdodds.com`,
		title: `Verify your email address`,
		verificationCode,
		verificationUrl,
	})
}

async function sendPasswordResetEmail({
	emailAddress,
	verificationCode,
	verificationUrl,
	domainUrl,
	team,
}: {
	emailAddress: string
	verificationCode: string
	verificationUrl: string
	domainUrl: string
	team?: string | null
}) {
	return sendVerificationCodeEmail({
		emailAddress,
		domainUrl,
		subject: `Reset your password for kentcdodds.com`,
		title: `Reset your password`,
		verificationCode,
		verificationUrl,
		team,
	})
}

export { sendEmail, sendSignupVerificationEmail, sendPasswordResetEmail }

/*
eslint
  max-statements: "off",
*/
