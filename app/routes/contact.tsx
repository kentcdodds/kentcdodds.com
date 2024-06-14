import {
	json,
	type HeadersFunction,
	type MetaFunction,
	type DataFunctionArgs,
} from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { Button } from '~/components/button.tsx'
import { ButtonGroup, ErrorPanel, Field } from '~/components/form-elements.tsx'
import { Grid } from '~/components/grid.tsx'
import {
	HeroSection,
	getHeroImageProps,
} from '~/components/sections/hero-section.tsx'
import { H2, Paragraph } from '~/components/typography.tsx'
import { getGenericSocialImage, images } from '~/images.tsx'
import { type RootLoaderType } from '~/root.tsx'
import { handleFormSubmission } from '~/utils/actions.server.ts'
import { getDisplayUrl, getUrl } from '~/utils/misc.tsx'
import { sendEmail } from '~/utils/send-email.server.ts'
import { getSocialMetas } from '~/utils/seo.ts'
import { requireUser } from '~/utils/session.server.ts'
import { useRootData } from '~/utils/use-root-data.ts'

function getErrorForSubject(subject: string | null) {
	if (!subject) return `Subject is required`
	if (subject.length <= 5) return `Subject is too short`
	if (subject.length > 120) return `Subject is too long`
	return null
}

function getErrorForBody(body: string | null) {
	if (!body) return `Body is required`
	if (body.length <= 40) return `Body is too short`
	if (body.length > 1001) return `Body is too long`
	return null
}

type ActionData = {
	status: 'success' | 'error'
	fields: {
		subject?: string | null
		body?: string | null
	}
	errors: {
		generalError?: string
		subject?: string | null
		body?: string | null
	}
}

export const action = async ({ request }: DataFunctionArgs) => {
	const user = await requireUser(request)
	return handleFormSubmission<ActionData>({
		request,
		validators: {
			subject: getErrorForSubject,
			body: getErrorForBody,
		},
		handleFormValues: async (fields) => {
			const { subject, body } = fields

			const sender = `"${user.firstName}" <${user.email}>`

			// this bit is included so I can have a filter that ensures
			// messages sent from the contact form never end up in spam.
			const noSpamMessage = '- Sent via the KCD Contact Form'

			await sendEmail({
				from: sender,
				to: `"Kent C. Dodds" <me@kentcdodds.com>`,
				subject,
				text: `${body}\n\n${noSpamMessage}`,
			})

			const actionData: ActionData = { fields, status: 'success', errors: {} }
			return json(actionData)
		},
	})
}

export const headers: HeadersFunction = () => ({
	'Cache-Control': 'private, max-age=3600',
	Vary: 'Cookie',
})

export const meta: MetaFunction<{}, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: 'Contact Kent C. Dodds',
		description: 'Send Kent C. Dodds a personal email.',
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			url: getDisplayUrl(requestInfo),
			featuredImage: 'unsplash/photo-1563225409-127c18758bd5',
			words: `Shoot Kent an email`,
		}),
	})
}

export default function ContactRoute() {
	const contactFetcher = useFetcher<typeof action>()
	const { user } = useRootData()

	const isDone = contactFetcher.state === 'idle' && contactFetcher.data != null
	const emailSuccessfullySent =
		isDone && (contactFetcher.data as ActionData).status === 'success'

	return (
		<div>
			<HeroSection
				title="Send me an email."
				subtitle="Like in the old days."
				image={
					<img
						{...getHeroImageProps(images.kentProfile, {
							className:
								'max-h-50vh rounded-bl-3xl rounded-br-[25%] rounded-tl-[25%] rounded-tr-3xl',
						})}
					/>
				}
			/>

			<main>
				<contactFetcher.Form
					method="POST"
					noValidate
					aria-describedby="contact-form-error"
				>
					<Grid>
						<div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
							<H2>Email me</H2>
							<Paragraph>
								{`
                  I do my best to respond, but unfortunately I can't always
                  respond to every email I receive. If you have a support
                  request about my open source work, please open an issue
                  on the GitHub repo instead. If you have a support need on one of
                  my courses, please email the team (`}
								<a href="mailto:team@epicreact.dev">team@epicreact.dev</a>
								{`, `}
								<a href="mailto:help@testingjavascript.com">
									help@testingjavascript.com
								</a>
								{`, or `}
								<a href="mailto:support@egghead.io">support@egghead.io</a>
								{`) instead. I'll just forward your message to them anyway.`}
							</Paragraph>
						</div>

						<div className="col-span-full lg:col-span-8 lg:col-start-3">
							{user ? (
								<>
									<Field
										name="name"
										label="Name"
										placeholder="Your name"
										disabled={true}
										defaultValue={user.firstName}
									/>
									<Field
										type="email"
										label="Email"
										placeholder="person.doe@example.com"
										disabled={true}
										defaultValue={user.email}
										name="email"
									/>
									<Field
										name="subject"
										label="Subject"
										placeholder="No subject"
										defaultValue={contactFetcher.data?.fields.subject ?? ''}
										error={contactFetcher.data?.errors.subject}
									/>
									<Field
										name="body"
										label="Body"
										type="textarea"
										placeholder="A clear and concise message works wonders."
										rows={8}
										defaultValue={contactFetcher.data?.fields.body ?? ''}
										error={contactFetcher.data?.errors.body}
									/>
									{emailSuccessfullySent ? (
										`Hooray, email sent! 🎉`
									) : (
										// IDEA: show a loading state here
										<ButtonGroup>
											<Button
												type="submit"
												disabled={contactFetcher.state !== 'idle'}
											>
												Send message
											</Button>
											<Button variant="secondary" type="reset">
												Reset form
											</Button>
										</ButtonGroup>
									)}
									{contactFetcher.data?.errors.generalError ? (
										<ErrorPanel id="contact-form-error">
											{contactFetcher.data.errors.generalError}
										</ErrorPanel>
									) : null}
								</>
							) : (
								<div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
									<Paragraph>
										Note: due to spam issues, you have to confirm your email by{' '}
										<Link to="/login" className="underline">
											signing up for an account
										</Link>{' '}
										on my website first.
									</Paragraph>
								</div>
							)}
						</div>
					</Grid>
				</contactFetcher.Form>
			</main>
		</div>
	)
}
