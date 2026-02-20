import { redirect } from 'react-router';
import  { type Route } from './+types/s.$query'

export async function loader({ request, params }: Route.LoaderArgs) {
	const q = typeof params.query === 'string' ? params.query.trim() : ''

	// Preserve the nice short `/s/<query>` URL, but send users to the main search UI.
	if (!q) return redirect('/search')

	const currentUrl = new URL(request.url)
	const to = new URL('/search', currentUrl.origin)
	to.searchParams.set('q', q)
	return redirect(`${to.pathname}${to.search}`)
}
