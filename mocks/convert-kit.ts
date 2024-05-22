import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
} from 'msw'

type RequestBody = {
	first_name: string
	email: string
	fields: Array<string>
}

const convertKitHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		'https://api.convertkit.com/v3/subscribers',
		() => {
			return HttpResponse.json({
				total_subscribers: 0,
				page: 1,
				total_pages: 1,
				subscribers: [],
			})
		},
	),
	http.get<any, DefaultRequestMultipartBody>(
		'https://api.convertkit.com/v3/subscribers/:subscriberId/tags',
		() => {
			return HttpResponse.json({
				tags: [
					{
						id: 1,
						name: 'Subscribed: general newsletter',
						created_at: '2021-06-09T17:54:22Z',
					},
				],
			})
		},
	),
	http.post<any, RequestBody>(
		'https://api.convertkit.com/v3/forms/:formId/subscribe',
		async ({ request, params }) => {
			const body = await request.json()
			const { formId } = params
			const { first_name, email, fields } = body
			return HttpResponse.json({
				subscription: {
					id: 1234567890,
					state: 'active',
					created_at: new Date().toJSON(),
					source: 'API::V3::SubscriptionsController (external)',
					referrer: null,
					subscribable_id: formId,
					subscribable_type: 'form',
					subscriber: {
						id: 987654321,
						first_name,
						email_address: email,
						state: 'inactive',
						created_at: new Date().toJSON(),
						fields,
					},
				},
			})
		},
	),
	http.post<any, RequestBody>(
		'https://api.convertkit.com/v3/tags/:tagId/subscribe',
		async ({ request, params }) => {
			const body = await request.json()
			const { tagId } = params
			const { first_name, email, fields } = body
			return HttpResponse.json({
				subscription: {
					id: 1234567890,
					state: 'active',
					created_at: new Date().toJSON(),
					source: 'API::V3::SubscriptionsController (external)',
					referrer: null,
					subscribable_id: tagId,
					subscribable_type: 'tag',
					subscriber: {
						id: 987654321,
						first_name,
						email_address: email,
						state: 'inactive',
						created_at: new Date().toJSON(),
						fields,
					},
				},
			})
		},
	),
]

export { convertKitHandlers }
