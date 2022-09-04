import {getRequiredServerEnvVar} from '../utils/misc'

const CONVERT_KIT_API_SECRET = getRequiredServerEnvVar('CONVERT_KIT_API_SECRET')
const CONVERT_KIT_API_KEY = getRequiredServerEnvVar('CONVERT_KIT_API_KEY')

type ConvertKitSubscriber = {
  id: number
  first_name: string
  email_address: string
  state: 'active' | 'inactive'
  created_at: string
  fields: Record<string, string | null>
}

type ConvertKitTag = {
  id: string
  name: string
  created_at: string
}

async function getConvertKitSubscriber(email: string) {
  const url = new URL('https://api.convertkit.com/v3/subscribers')
  url.searchParams.set('api_secret', CONVERT_KIT_API_SECRET)
  url.searchParams.set('email_address', email)

  const resp = await fetch(url.toString())
  const json = await resp.json()
  const {subscribers: [subscriber = {state: 'inactive'}] = []} = json as {
    subscribers?: Array<ConvertKitSubscriber>
  }

  return subscriber.state === 'active' ? subscriber : null
}

async function getConvertKitSubscriberTags(
  subscriberId: ConvertKitSubscriber['id'],
) {
  const url = new URL(
    `https://api.convertkit.com/v3/subscribers/${subscriberId}/tags`,
  )
  url.searchParams.set('api_secret', CONVERT_KIT_API_SECRET)

  const resp = await fetch(url.toString())
  const json = (await resp.json()) as {
    tags: Array<ConvertKitTag>
  }
  return json.tags
}

async function ensureSubscriber({
  email,
  firstName,
}: {
  email: string
  firstName: string
}) {
  let subscriber = await getConvertKitSubscriber(email)
  if (!subscriber) {
    // this is a basic form that doesn't really do anything. It's just a way to
    // get the users on the mailing list
    subscriber = await addSubscriberToForm({
      email,
      firstName,
      convertKitFormId: '2500372',
    })
  }

  return subscriber
}

async function addSubscriberToForm({
  email,
  firstName,
  convertKitFormId,
}: {
  email: string
  firstName: string
  convertKitFormId: string
}) {
  const subscriberData = {
    api_key: CONVERT_KIT_API_KEY,
    api_secret: CONVERT_KIT_API_SECRET,
    first_name: firstName,
    email,
  }

  // this is a basic form that doesn't really do anything. It's just a way to
  // get the users on the mailing list
  const response = await fetch(
    `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`,
    {
      method: 'post',
      body: JSON.stringify(subscriberData),
      headers: {'Content-Type': 'application/json'},
    },
  )
  const json = (await response.json()) as {
    subscription: {subscriber: ConvertKitSubscriber}
  }
  return json.subscription.subscriber
}

async function addTagToSubscriber({
  email,
  firstName,
  convertKitTagId,
}: {
  email: string
  firstName: string
  convertKitTagId: string
}) {
  await ensureSubscriber({email, firstName})
  const subscriberData = {
    api_key: CONVERT_KIT_API_KEY,
    api_secret: CONVERT_KIT_API_SECRET,
    first_name: firstName,
    email,
  }

  const subscribeUrl = `https://api.convertkit.com/v3/tags/${convertKitTagId}/subscribe`
  const response = await fetch(subscribeUrl, {
    method: 'post',
    body: JSON.stringify(subscriberData),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const json = (await response.json()) as {
    subscription: {subscriber: ConvertKitSubscriber}
  }
  return json.subscription.subscriber
}

async function tagKCDSiteSubscriber({
  email,
  firstName,
  fields,
}: {
  email: string
  firstName: string
  fields: Record<string, string>
}) {
  const subscriber = await getConvertKitSubscriber(email)
  const kcdTagId = '2466369'
  const kcdSiteForm = '2393887'
  const subscriberData = {
    api_key: CONVERT_KIT_API_KEY,
    api_secret: CONVERT_KIT_API_SECRET,
    first_name: firstName,
    email,
    fields,
  }
  // the main difference in subscribing to a tag and subscribing to a
  // form is that in the form's case, the user will get a double opt-in
  // email before they're a confirmed subscriber. So we only add the
  // tag to existing subscribers who have already confirmed.
  // This form auto-adds the tag to new subscribers
  const subscribeUrl = subscriber
    ? `https://api.convertkit.com/v3/tags/${kcdTagId}/subscribe`
    : `https://api.convertkit.com/v3/forms/${kcdSiteForm}/subscribe`
  const updatedRes = await fetch(subscribeUrl, {
    method: 'post',
    body: JSON.stringify(subscriberData),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const updatedJson = (await updatedRes.json()) as {
    subscription: {subscriber: ConvertKitSubscriber}
  }
  return updatedJson.subscription.subscriber
}

export {
  getConvertKitSubscriber,
  getConvertKitSubscriberTags,
  tagKCDSiteSubscriber,
  addTagToSubscriber,
  addSubscriberToForm,
}
