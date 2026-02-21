import { data as json } from 'react-router';
import { getErrorMessage } from '#app/utils/misc.ts'
import { deleteKitCache } from '#app/utils/user-info.server.ts'
import * as ck from './kit.server.ts'
import { type ActionData, type Errors, type Fields } from './types.ts'

function getErrorForFirstName(name: string | null) {
	if (!name) return `Name is required`
	if (name.length > 60) return `Name is too long`
	return null
}

function getErrorForEmail(email: string | null) {
	if (!email) return `Email is required`
	if (!/^.+@.+\..+$/.test(email)) return `That's not an email`
	return null
}

function getErrorForkitTagId(tagId: string | null, form: URLSearchParams) {
	if (!form.get('kitFormId') && !tagId) {
		return `kitTagId is required if kitFormId is not specified`
	}
	if (!tagId) return null
	if (tagId.length < 2) return `Convert Kit Tag ID is incorrect`
	return null
}

function getErrorForkitFormId(formId: string | null, form: URLSearchParams) {
	if (!form.get('kitTagId') && !formId) {
		return `kitFormId is required if kitTagId is not specified`
	}
	if (!formId) return null
	if (formId.length < 2) return `Convert Kit Form ID is incorrect`
	return null
}

function getErrorForFormId(value: string | null) {
	if (!value) return `Form ID is required`
	return null
}

async function handleKitFormSubmission(request: Request) {
	const requestText = await request.text()
	const form = new URLSearchParams(requestText)

	const fields: Fields = {
		formId: form.get('formId') ?? '',
		firstName: form.get('firstName') ?? '',
		email: form.get('email') ?? '',
		kitTagId: form.get('kitTagId') ?? '',
		kitFormId: form.get('kitFormId') ?? '',
		url: form.get('url'),
	}

	const errors: Errors = {
		generalError: null,
		formId: getErrorForFormId(fields.formId),
		firstName: getErrorForFirstName(fields.firstName),
		email: getErrorForEmail(fields.email),
		kitTagId: getErrorForkitTagId(fields.kitTagId, form),
		kitFormId: getErrorForkitFormId(fields.kitFormId, form),
		url: null,
	}

	const failedHoneypot = Boolean(fields.url)
	if (failedHoneypot) {
		console.info(`FAILED HONEYPOT`, fields)
		return json({ status: 'success' })
	}

	let data: ActionData

	if (Object.values(errors).some((err) => err !== null)) {
		data = { status: 'error', errors }
		return json(data, 400)
	}

	try {
		let subscriberId: number | null = null
		if (fields.kitFormId) {
			const subscriber = await ck.addSubscriberToForm(fields)
			subscriberId = subscriber.id
		}
		if (fields.kitTagId) {
			const subscriber = await ck.addTagToSubscriber(fields)
			subscriberId = subscriber.id
		}

		if (subscriberId) {
			// if this errors out it's not a big deal. The cache will expire eventually
			await deleteKitCache(subscriberId).catch(() => {})
		}
	} catch (error: unknown) {
		errors.generalError = getErrorMessage(error)
		data = { status: 'error', errors }
		return json(data, 500)
	}

	data = { status: 'success' }
	return json(data)
}

export { handleKitFormSubmission }
