import { getRandomFlyingKody } from '#app/images.tsx'
import { buildMediaUrl } from '#app/utils/media.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { markdownToHtmlDocument } from './markdown.server.ts'
import { getOptionalTeam } from './misc.ts'

type EmailMessage = {
	to: string
	from: string
	subject: string
	text: string
	html?: string | null
	/**
	 * Where replies should go when it differs from `from`. Cloudflare Email
	 * Sending enforces that `from` is on the onboarded domain, so e.g. the
	 * contact form sends from our own address with the visitor in `replyTo`.
	 */
	replyTo?: string
}

/**
 * Cloudflare Email Sending REST `from` / `to` / `reply_to` accept a plain
 * address string or `{ address, name }` — not RFC 5322 `"Name" <addr>`
 * strings (those fail `email.sending.error.invalid_request_schema`).
 * https://developers.cloudflare.com/api/resources/email_sending
 */
type EmailSendingAddress =
	| string
	| {
			address: string
			name?: string
	  }

type CloudflareEmailSendResponse = {
	success?: boolean
	errors?: Array<{ code?: number; message?: string }>
	result?: { permanent_bounces?: Array<string> }
}

const TRANSIENT_EMAIL_SEND_STATUSES = new Set([429, 500, 503])
const EMAIL_SEND_MAX_ATTEMPTS = 2

class EmailSendError extends Error {
	readonly status: number
	readonly codes: Array<number>
	readonly providerBody: string

	constructor({
		status,
		codes,
		providerBody,
	}: {
		status: number
		codes: Array<number>
		providerBody: string
	}) {
		const codeSuffix = codes.length > 0 ? ` codes=${codes.join(',')}` : ''
		super(`Email send failed with status ${status}${codeSuffix}`)
		this.name = 'EmailSendError'
		this.status = status
		this.codes = codes
		this.providerBody = providerBody
	}
}

function parseEmailSendingAddress(value: string): {
	address: string
	name?: string
} {
	const trimmed = value.trim()
	const angled =
		/^(?:"((?:[^"\\]|\\.)*)"|([^<"]*?))\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(
			trimmed,
		)
	if (!angled) return { address: trimmed }

	const rawName = angled[1] ?? angled[2] ?? ''
	const name = rawName.replace(/\\"/g, '"').trim()
	const address = angled[3]
	return name ? { address, name } : { address }
}

function toEmailSendingAddress(value: string): EmailSendingAddress {
	const parsed = parseEmailSendingAddress(value)
	return parsed.name ? parsed : parsed.address
}

function parseCloudflareEmailSendResponse(body: string) {
	try {
		return JSON.parse(body) as CloudflareEmailSendResponse
	} catch {
		return null
	}
}

/**
 * Sends via Cloudflare Email Service (Email Sending REST API).
 * https://developers.cloudflare.com/email-service/api/send-emails/rest-api/
 * Uses the shared CLOUDFLARE_API_TOKEN, which has the Email Sending Edit
 * permission alongside its other scopes.
 */
async function sendEmail({
	to,
	from,
	subject,
	text,
	html,
	replyTo,
}: EmailMessage) {
	const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = getEnv()

	if (html === undefined) {
		html = await markdownToHtmlDocument(text)
	} else if (html === null) {
		html = text
	}

	const payload = {
		to: toEmailSendingAddress(to),
		from: toEmailSendingAddress(from),
		subject,
		text,
		html,
		...(replyTo ? { reply_to: toEmailSendingAddress(replyTo) } : {}),
	}
	const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/sending/send`
	const headers = {
		authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
		'content-type': 'application/json',
	}

	for (let attempt = 1; attempt <= EMAIL_SEND_MAX_ATTEMPTS; attempt++) {
		let response: Response
		try {
			response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload),
			})
		} catch (error: unknown) {
			if (attempt < EMAIL_SEND_MAX_ATTEMPTS) {
				console.warn(
					`Email send fetch failed (attempt ${attempt}/${EMAIL_SEND_MAX_ATTEMPTS}), retrying`,
					error,
				)
				continue
			}
			throw error
		}

		const body = await response.text().catch(() => '<unreadable>')
		const parsed = parseCloudflareEmailSendResponse(body)
		const codes =
			parsed?.errors
				?.map((error) => error.code)
				.filter((code): code is number => typeof code === 'number') ?? []

		if (
			TRANSIENT_EMAIL_SEND_STATUSES.has(response.status) &&
			attempt < EMAIL_SEND_MAX_ATTEMPTS
		) {
			console.warn(
				`Email send transient failure (${response.status}) attempt ${attempt}/${EMAIL_SEND_MAX_ATTEMPTS} to=${to} subject=${JSON.stringify(subject)}: ${body.slice(0, 500)}`,
			)
			continue
		}

		if (!response.ok || parsed?.success === false) {
			console.error(
				`Email send failed (${response.status}) to=${to} subject=${JSON.stringify(subject)}: ${body.slice(0, 500)}`,
			)
			throw new EmailSendError({
				status: response.status,
				codes,
				providerBody: body.slice(0, 500),
			})
		}

		const bounces = parsed?.result?.permanent_bounces ?? []
		if (bounces.length > 0) {
			console.warn(`Email permanently bounced for: ${bounces.join(', ')}`)
		}
		return
	}
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

      <center><img src="${buildMediaUrl(randomSportyKody.id, { width: 800 }, { origin: domainUrl })}" style="max-width: 80%;${
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

export {
	EmailSendError,
	sendEmail,
	sendSignupVerificationEmail,
	sendPasswordResetEmail,
	toEmailSendingAddress,
}

/*
eslint
  max-statements: "off",
*/
