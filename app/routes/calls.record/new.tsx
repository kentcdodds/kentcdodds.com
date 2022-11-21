import * as React from 'react'
import type {ActionFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useActionData} from '@remix-run/react'
import type {KCDHandle} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {CallRecorder} from '~/components/calls/recorder'
import type {RecordingFormData} from '~/components/calls/submit-recording-form'
import {RecordingForm} from '~/components/calls/submit-recording-form'
import {requireUser} from '~/utils/session.server'
import {prisma} from '~/utils/prisma.server'
import {
  getDomainUrl,
  getErrorMessage,
  getNonNull,
  getOptionalTeam,
  getRequiredServerEnvVar,
} from '~/utils/misc'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '~/utils/call-kent'
import {H4, Paragraph} from '~/components/typography'
import {Grimmacing} from '~/components/kifs'
import {Grid} from '~/components/grid'
import {sendMessageFromDiscordBot} from '~/utils/discord.server'
import {teamEmoji} from '~/utils/team-provider'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const action: ActionFunction = async ({request}) => {
  const user = await requireUser(request)
  const actionData: ActionData = {fields: {}, errors: {}}
  const domainUrl = getDomainUrl(request)
  try {
    const requestText = await request.text()
    const form = new URLSearchParams(requestText)

    const formData = {
      audio: form.get('audio'),
      title: form.get('title'),
      description: form.get('description'),
      keywords: form.get('keywords'),
    }
    actionData.fields = {
      title: formData.title,
      description: formData.description,
      keywords: formData.keywords,
    }

    actionData.errors = {
      audio: getErrorForAudio(formData.audio),
      title: getErrorForTitle(formData.title),
      description: getErrorForDescription(formData.description),
      keywords: getErrorForKeywords(formData.keywords),
    }

    if (Object.values(actionData.errors).some(err => err !== null)) {
      return json(actionData, 401)
    }

    const {audio, title, description, keywords} = getNonNull(formData)

    const call = {
      title,
      description,
      keywords,
      userId: user.id,
      base64: audio,
    }
    const createdCall = await prisma.call.create({data: call})

    try {
      const channelId = getRequiredServerEnvVar('DISCORD_PRIVATE_BOT_CHANNEL')
      const adminUserId = getRequiredServerEnvVar('DISCORD_ADMIN_USER_ID')
      const {firstName, team, discordId} = user
      const userMention = discordId ? `<@!${discordId}>` : firstName
      const emoji = teamEmoji[getOptionalTeam(team)]
      const message = `📳 <@!${adminUserId}> ring ring! New call from ${userMention} ${emoji}: "${title}"\n\n${description}\n\n${domainUrl}/calls/admin/${createdCall.id}`
      void sendMessageFromDiscordBot(channelId, message)
    } catch (error: unknown) {
      console.error('Problem sending a call message', error)
      // ignore
    }
    return redirect(`/calls/record/${createdCall.id}`)
  } catch (error: unknown) {
    actionData.errors.generalError = getErrorMessage(error)
    return json(actionData, 500)
  }
}

type ActionData = RecordingFormData

export default function RecordScreen() {
  const actionData = useActionData<ActionData>()
  const [audio, setAudio] = React.useState<Blob | null>(null)
  const {user, userInfo} = useRootData()
  // should be impossible...
  if (!user || !userInfo) throw new Error('user and userInfo required')
  return (
    <div>
      {audio ? (
        <RecordingForm audio={audio} data={actionData} />
      ) : (
        <div>
          <Paragraph className="mb-4">
            {`
              Choose which recording device you would like to use.
              Then click "Start Recording," introduce yourself
              ("Hi, Kent, my name is ${user.firstName}") and say whatever you'd like.
              Try to keep it 2 minutes or less. Thanks!
            `}
          </Paragraph>
          {userInfo.avatar.hasGravatar ? null : (
            <Paragraph className="mb-4">
              {`
                Oh, and I noticed that your avatar is generic. If you want your
                episode art to be a photo of you, then you'll want to set your
                avatar to a photo of you
              `}
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                on Gravatar
              </a>
              {'.'}
            </Paragraph>
          )}
          <CallRecorder
            onRecordingComplete={recording => setAudio(recording)}
            team={user.team}
          />
        </div>
      )}
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return (
    <div>
      <Grid nested>
        <div className="col-span-6">
          <H4 as="p">{`Yikes... Something went wrong. Sorry about that.`}</H4>
          <H4 as="p" variant="secondary" className="mt-3">
            {`Want to `}
            <Link to=".">try again?</Link>
          </H4>
        </div>
        <Grimmacing
          className="col-span-5 col-start-7 rounded-lg"
          aspectRatio="3:4"
        />
      </Grid>
    </div>
  )
}
