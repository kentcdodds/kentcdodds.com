import { redirect } from 'react-router'
import { type KCDHandle } from '#app/types.ts'

import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { type Route } from './+types/magic'
export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	const loginInfoSession = await getLoginInfoSession(request)
	loginInfoSession.clean()
	loginInfoSession.flashMessage(
		'Magic links are no longer supported. Please log in with your password (or reset it).',
	)
	return redirect('/login', { headers: await loginInfoSession.getHeaders() })
}

export default function Magic() {
	return (
		<div>
			{`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
		</div>
	)
}
