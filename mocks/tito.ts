import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
} from 'msw'

const tiToHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		'https://api.tito.io/v3/hello',
		async () => {
			return HttpResponse.json({
				accounts: ['kent-c-dodds', 'epic-web'],
			})
		},
	),
	http.get<any, DefaultRequestMultipartBody>(
		'https://api.tito.io/v3/:account/events',
		async ({ params }) => {
			const slug = 'testing-this-isn-t-a-real-event'
			return HttpResponse.json({
				events: [
					{
						live: true,
						title: `TESTING (this isn't a real ${params.account ?? ''} event)`,
						description: 'This is a short description',
						banner: { url: null, thumb: { url: null } },
						slug,
						metadata: { workshopSlug: 'react-hooks' },
						url: `https://ti.to/kent-c-dodds/${slug}`,
					},
				],
				meta: {},
			})
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://api.tito.io/v3/:account/:eventSlug',
		async () => {
			return HttpResponse.json({
				event: {
					location: 'Zoom',
					date_or_range: 'March 23rd, 2024',
					releases: [
						{
							quantity: 40,
							tickets_count: 2,
						},
					],
				},
			})
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://api.tito.io/v3/:account/:eventSlug/discount_codes',
		async ({ params }) => {
			const code = 'early'
			return HttpResponse.json({
				discount_codes: [
					{
						code,
						end_at: '2024-03-23T06:00:00.000-06:00',
						quantity: 10,
						quantity_used: 0,
						share_url: `https://ti.to/kent-c-dodds/${params.eventSlug}/discount/${code}`,
						state: 'current',
					},
				],
				meta: {},
			})
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://api.tito.io/v3/:account/:eventSlug/activities',
		async () => {
			return HttpResponse.json({
				activities: [
					{
						start_at: '2024-03-24T09:30:00.000-06:00',
						end_at: '2024-03-24T13:30:00.000-06:00',
					},
				],
				meta: {},
			})
		},
	),
]

export { tiToHandlers }
