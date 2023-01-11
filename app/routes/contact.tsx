import type {
  ActionFunction,
  HeadersFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useFetcher} from '@remix-run/react'
import {useRootData} from '~/utils/use-root-data'
import {
  getHeroImageProps,
  HeroSection,
} from '~/components/sections/hero-section'
import {getGenericSocialImage, images} from '~/images'
import {H2, Paragraph} from '~/components/typography'
import {ButtonGroup, ErrorPanel, Field} from '~/components/form-elements'
import {Grid} from '~/components/grid'
import {handleFormSubmission} from '~/utils/actions.server'
import {sendEmail} from '~/utils/send-email.server'
import {Button} from '~/components/button'
import type {LoaderData as RootLoaderData} from '../root'
import {getSocialMetas} from '~/utils/seo'
import {getDisplayUrl, getUrl} from '~/utils/misc'
import {requireUser} from '~/utils/session.server'

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

export const action: ActionFunction = async ({request}) => {
  const user = await requireUser(request)
  return handleFormSubmission<ActionData>({
    request,
    validators: {
      subject: getErrorForSubject,
      body: getErrorForBody,
    },
    handleFormValues: async fields => {
      const {subject, body} = fields

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

      const actionData: ActionData = {fields, status: 'success', errors: {}}
      return json(actionData)
    },
  })
}

export const headers: HeadersFunction = () => ({
  'Cache-Control': 'private, max-age=3600',
  Vary: 'Cookie',
})

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  return {
    ...getSocialMetas({
      title: 'Contact Kent C. Dodds',
      description: 'Send Kent C. Dodds a personal email.',
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: 'unsplash/photo-1563225409-127c18758bd5',
        words: `Shoot Kent an email`,
      }),
    }),
  }
}

export default function ContactRoute() {
  const contactFetcher = useFetcher()
  const {user} = useRootData()

  const emailSuccessfullySent =
    contactFetcher.type === 'done' &&
    (contactFetcher.data as ActionData).status === 'success'

  return (
    <div>
      <HeroSection
        title="Send me an email."
        subtitle="Like in the old days."
        image={
          <img
            className="max-h-50vh rounded-br-[25%] rounded-tl-[25%] rounded-bl-3xl rounded-tr-3xl"
            {...getHeroImageProps(images.kentProfile)}
          />
        }
      />

      <main>
        <contactFetcher.Form
          method="post"
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
                    <>
                      {`Hooray, email sent! `}
                      <span role="img" aria-label="party popper emoji">
                        🎉
                      </span>
                    </>
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
