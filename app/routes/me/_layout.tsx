import { Dialog } from '@reach/dialog'
import { clsx } from 'clsx'
import * as React from 'react'
import {
	data as json,
	redirect,
	type HeadersFunction,
	type MetaFunction,
	Form,
	Link,
} from 'react-router'
import { Button, ButtonLink } from '#app/components/button.tsx'
import { Field, InputError, Label } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import {
	CheckCircledIcon,
	LogoutIcon,
	PlusIcon,
	RefreshIcon,
} from '#app/components/icons.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H3, H6, Paragraph } from '#app/components/typography.tsx'
import { getGenericSocialImage, images } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { FavoriteToggle } from '#app/routes/resources/favorite.tsx'
import { type KCDHandle } from '#app/types.ts'
import { handleFormSubmission } from '#app/utils/actions.server.ts'
import { getEpisodePath } from '#app/utils/call-kent.ts'
import { getCWKEpisodePath } from '#app/utils/chats-with-kent.ts'
import {
	getEpisodeFavoriteContentId,
	parseEpisodeFavoriteContentId,
	type FavoriteContentType,
} from '#app/utils/favorites.ts'
import { getBlogMdxListItems } from '#app/utils/mdx.server.ts'
import {
	getDiscordAuthorizeURL,
	getDisplayUrl,
	getErrorMessage,
	getOrigin,
	getTeam,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.ts'
import {
	TEAM_ONEWHEELING_MAP,
	TEAM_SKIING_MAP,
	TEAM_SNOWBOARD_MAP,
} from '#app/utils/onboarding.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import {
	deleteOtherSessions,
	getSession,
	requireUser,
} from '#app/utils/session.server.ts'
import { getSeasonListItems } from '#app/utils/simplecast.server.ts'
import { getTalksAndTags } from '#app/utils/talks.server.ts'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { getEpisodes } from '#app/utils/transistor.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import {
	deleteKitCache,
	deleteDiscordCache,
	gravatarExistsForEmail,
} from '#app/utils/user-info.server.ts'
import { type Route } from './+types/_layout'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	const domain = new URL(getOrigin(requestInfo)).host
	return getSocialMetas({
		title: `Your account on ${domain}`,
		description: `Personal account information on ${domain}.`,
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			url: getDisplayUrl(requestInfo),
			featuredImage: images.kodySnowboardingGray(),
			words: `View your account info on ${domain}`,
		}),
	})
}

type FavoriteDisplayItem = {
	contentType: FavoriteContentType
	contentId: string
	title: string
	href: string
	subtitle: string
}

export async function loader({ request }: Route.LoaderArgs) {
	const timings = {}
	const user = await requireUser(request, { timings })

	const [sessionCount, rawFavorites, callKentCallerEpisodes] =
		await Promise.all([
			prisma.session.count({
				where: { userId: user.id },
			}),
			prisma.favorite.findMany({
				where: { userId: user.id },
				select: { contentType: true, contentId: true, createdAt: true },
				orderBy: { createdAt: 'desc' },
			}),
			prisma.callKentCallerEpisode.findMany({
				where: { userId: user.id },
				select: {
					id: true,
					transistorEpisodeId: true,
					isAnonymous: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
			}),
		])

	const wantsBlogPosts = rawFavorites.some((f) => f.contentType === 'blog-post')
	const wantsTalks = rawFavorites.some((f) => f.contentType === 'talk')
	const wantsCallEpisodes = rawFavorites.some(
		(f) => f.contentType === 'call-kent-episode',
	)
	const wantsCallEpisodeData =
		wantsCallEpisodes || callKentCallerEpisodes.length > 0
	const wantsChatEpisodes = rawFavorites.some(
		(f) => f.contentType === 'chats-with-kent-episode',
	)

	const [blogPosts, talksAndTags, callEpisodes, chatSeasons] =
		await Promise.all([
			wantsBlogPosts ? getBlogMdxListItems({ request, timings }) : [],
			wantsTalks
				? getTalksAndTags({ request, timings })
				: { talks: [], tags: [] },
			wantsCallEpisodeData ? getEpisodes({ request, timings }) : [],
			wantsChatEpisodes ? getSeasonListItems({ request, timings }) : [],
		])

	const blogTitleBySlug = new Map(
		blogPosts.map((post) => [post.slug, post.frontmatter.title ?? post.slug]),
	)
	const talkTitleBySlug = new Map(
		talksAndTags.talks.map((talk) => [talk.slug, talk.title]),
	)
	const callEpisodeById = new Map(
		callEpisodes.map((episode) => [
			getEpisodeFavoriteContentId({
				seasonNumber: episode.seasonNumber,
				episodeNumber: episode.episodeNumber,
			}),
			episode,
		]),
	)
	const callEpisodeByTransistorId = new Map(
		callEpisodes.map((episode) => [episode.transistorEpisodeId, episode]),
	)
	const chatEpisodeById = new Map(
		chatSeasons
			.flatMap((s) => s.episodes)
			.map((episode) => [
				getEpisodeFavoriteContentId({
					seasonNumber: episode.seasonNumber,
					episodeNumber: episode.episodeNumber,
				}),
				episode,
			]),
	)

	const favorites: Array<FavoriteDisplayItem> = rawFavorites
		.map((favorite): FavoriteDisplayItem | null => {
			switch (favorite.contentType) {
				case 'blog-post': {
					const title =
						blogTitleBySlug.get(favorite.contentId) ?? favorite.contentId
					return {
						contentType: 'blog-post',
						contentId: favorite.contentId,
						title,
						href: `/blog/${favorite.contentId}`,
						subtitle: 'Blog post',
					}
				}
				case 'talk': {
					const title =
						talkTitleBySlug.get(favorite.contentId) ?? favorite.contentId
					return {
						contentType: 'talk',
						contentId: favorite.contentId,
						title,
						href: `/talks/${favorite.contentId}`,
						subtitle: 'Talk',
					}
				}
				case 'youtube-video': {
					const videoId = favorite.contentId
					return {
						contentType: 'youtube-video',
						contentId: videoId,
						title: `YouTube video ${videoId}`,
						href: `/youtube?video=${encodeURIComponent(videoId)}`,
						subtitle: 'YouTube video',
					}
				}
				case 'call-kent-episode': {
					const parsed = parseEpisodeFavoriteContentId(favorite.contentId)
					if (!parsed) return null
					const episode = callEpisodeById.get(favorite.contentId)
					const title = episode?.title ?? `Call Kent Episode`
					return {
						contentType: 'call-kent-episode',
						contentId: favorite.contentId,
						title,
						href: episode
							? getEpisodePath(episode)
							: getEpisodePath({
									seasonNumber: parsed.seasonNumber,
									episodeNumber: parsed.episodeNumber,
								}),
						subtitle: `Calls — Season ${parsed.seasonNumber} Episode ${parsed.episodeNumber}`,
					}
				}
				case 'chats-with-kent-episode': {
					const parsed = parseEpisodeFavoriteContentId(favorite.contentId)
					if (!parsed) return null
					const episode = chatEpisodeById.get(favorite.contentId)
					const title = episode?.title ?? `Chats with Kent Episode`
					return {
						contentType: 'chats-with-kent-episode',
						contentId: favorite.contentId,
						title,
						href: episode
							? getCWKEpisodePath(episode)
							: getCWKEpisodePath({
									seasonNumber: parsed.seasonNumber,
									episodeNumber: parsed.episodeNumber,
								}),
						subtitle: `Chats — Season ${parsed.seasonNumber} Episode ${parsed.episodeNumber}`,
					}
				}
				default: {
					return null
				}
			}
		})
		.filter((v): v is FavoriteDisplayItem => Boolean(v))
	const activities = ['skiing', 'snowboarding', 'onewheeling'] as const
	const activity: 'skiing' | 'snowboarding' | 'onewheeling' =
		activities[Math.floor(Math.random() * activities.length)] ?? 'skiing'

	const callKentCallerEpisodesDisplay = callKentCallerEpisodes.map((entry) => {
		const episode = callEpisodeByTransistorId.get(entry.transistorEpisodeId)
		if (!episode) {
			return {
				id: entry.id,
				seasonNumber: null,
				episodeNumber: null,
				slug: '',
				episodeTitle: 'Call Kent episode (unavailable)',
				episodePath: '/calls',
				imageUrl: null,
				isAnonymous: entry.isAnonymous,
				createdAt: entry.createdAt,
			}
		}
		return {
			id: entry.id,
			seasonNumber: episode.seasonNumber,
			episodeNumber: episode.episodeNumber,
			slug: episode.slug,
			episodeTitle: episode.title,
			episodePath: getEpisodePath({
				seasonNumber: episode.seasonNumber,
				episodeNumber: episode.episodeNumber,
				slug: episode.slug,
			}),
			imageUrl: episode.imageUrl,
			isAnonymous: entry.isAnonymous,
			createdAt: entry.createdAt,
		}
	})
	return json(
		{
			sessionCount,
			teamType: activity,
			favorites,
			callKentCallerEpisodes: callKentCallerEpisodesDisplay,
		} as const,
		{
			headers: {
				'Cache-Control': 'private, max-age=3600',
				Vary: 'Cookie',
				'Server-Timing': getServerTimeHeader(timings),
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

const actionIds = {
	logout: 'logout',
	changeDetails: 'change details',
	deleteDiscordConnection: 'delete discord connection',
	deleteAccount: 'delete account',
	deleteSessions: 'delete sessions',
	refreshGravatar: 'refresh gravatar',
}

function getFirstNameError(firstName: string | null) {
	if (!firstName?.length) return 'First name is required'
	return null
}

type ActionData = {
	status: 'success' | 'error'
	fields: {
		firstName?: string | null
	}
	errors: {
		generalError?: string | null
		firstName?: string | null
	}
}
export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const form = new URLSearchParams(await request.text())
	const actionId = form.get('actionId')

	try {
		if (actionId === actionIds.logout) {
			const session = await getSession(request)
			await session.signOut()
			const searchParams = new URLSearchParams({
				message: `👋 See you again soon!`,
			})
			return redirect(`/?${searchParams.toString()}`, {
				headers: await session.getHeaders(),
			})
		}
		if (actionId === actionIds.deleteDiscordConnection && user.discordId) {
			await deleteDiscordCache(user.discordId)
			await prisma.user.update({
				where: { id: user.id },
				data: { discordId: null },
			})
			const searchParams = new URLSearchParams({
				message: `✅ Connection deleted`,
			})
			return redirect(`/me?${searchParams.toString()}`)
		}
		if (actionId === actionIds.changeDetails) {
			return await handleFormSubmission<ActionData>({
				form,
				validators: { firstName: getFirstNameError },
				handleFormValues: async ({ firstName }) => {
					if (firstName && user.firstName !== firstName) {
						await prisma.user.update({
							where: { id: user.id },
							data: { firstName },
						})
					}
					const searchParams = new URLSearchParams({
						message: `✅ Sucessfully saved your info`,
					})
					return redirect(`/me?${searchParams.toString()}`)
				},
			})
		}
		if (actionId === actionIds.deleteSessions) {
			await deleteOtherSessions(request)
			const searchParams = new URLSearchParams({
				message: `✅ Sucessfully signed out of other sessions`,
			})
			return redirect(`/me?${searchParams.toString()}`)
		}
		if (actionId === actionIds.deleteAccount) {
			const session = await getSession(request)
			await session.signOut()
			if (user.discordId) await deleteDiscordCache(user.discordId)
			if (user.kitId) await deleteKitCache(user.kitId)

			await prisma.user.delete({ where: { id: user.id } })
			const searchParams = new URLSearchParams({
				message: `✅ Your KCD account and all associated data has been completely deleted from the KCD database.`,
			})
			return redirect(`/?${searchParams.toString()}`, {
				headers: await session.getHeaders(),
			})
		}
		if (actionId === actionIds.refreshGravatar) {
			await gravatarExistsForEmail({ email: user.email, forceFresh: true })
		}
		return redirect('/me')
	} catch (error: unknown) {
		return json(
			{
				fields: { firstName: null },
				errors: { generalError: getErrorMessage(error), firstName: null },
			},
			500,
		)
	}
}

function YouScreen({ loaderData: data, actionData }: Route.ComponentProps) {
	const teamMap = {
		skiing: TEAM_SKIING_MAP,
		snowboarding: TEAM_SNOWBOARD_MAP,
		onewheeling: TEAM_ONEWHEELING_MAP,
	}[data.teamType]
	const otherSessionsCount = data.sessionCount - 1
	const { requestInfo, userInfo, user } = useRootData()
	const team = getTeam(user?.team)

	// this *should* never happen...
	if (!user) throw new Error('user required')
	if (!userInfo) throw new Error('userInfo required')
	if (!team) throw new Error('team required')

	const authorizeURL = getDiscordAuthorizeURL(requestInfo.origin)
	const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

	return (
		<main>
			<div className="mt-24 mb-64 pt-6">
				<Grid>
					<div className="col-span-full mb-12 lg:mb-20">
						<div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
							<div>
								<H2>{`Here's your profile.`}</H2>
								<H2 variant="secondary" as="p">
									{`Edit as you wish.`}
								</H2>
							</div>
							<Form action="/me" method="POST">
								<input type="hidden" name="actionId" value={actionIds.logout} />
								<Button variant="secondary">
									<LogoutIcon />
									<H6 as="span">logout</H6>
								</Button>
							</Form>
						</div>
					</div>
					<InputError id="general-erorr">
						{actionData?.errors.generalError}
					</InputError>

					<div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
						<Form
							action="/me"
							method="POST"
							noValidate
							aria-describedby="general-error"
						>
							{/* This ensures that hitting "enter" on a field sends the expected submission */}
							<button
								hidden
								type="submit"
								name="actionId"
								value={actionIds.changeDetails}
							/>
							<Field
								name="firstName"
								label="First name"
								defaultValue={actionData?.fields.firstName ?? user.firstName}
								autoComplete="given-name"
								required
								error={actionData?.errors.firstName}
							/>
							<Field
								name="email"
								label="Email address"
								autoComplete="email"
								required
								defaultValue={user.email}
								description={
									<div className="flex gap-1">
										<span>
											{`This controls your avatar via `}
											<a
												className="underlined font-bold"
												href="https://gravatar.com"
												target="_blank"
												rel="noreferrer noopener"
											>
												Gravatar
											</a>
											{'.'}
										</span>
										<button
											type="submit"
											name="actionId"
											value={actionIds.refreshGravatar}
										>
											<RefreshIcon />
										</button>
									</div>
								}
								readOnly
								disabled
							/>

							<Field
								name="discord"
								label="Discord"
								defaultValue={
									userInfo.discord?.username ?? user.discordId ?? ''
								}
								placeholder="n/a"
								readOnly
								disabled
								description={
									user.discordId ? (
										<div className="flex gap-2">
											<a
												className="underlined"
												href={`https://discord.com/users/${user.discordId}`}
											>
												connected
											</a>
											<button
												name="actionId"
												value={actionIds.deleteDiscordConnection}
												type="submit"
												aria-label="remove connection"
												className="text-secondary rotate-45 outline-none hover:scale-150 focus:scale-150"
											>
												<PlusIcon />
											</button>
										</div>
									) : (
										<a className="underlined" href={authorizeURL}>
											Connect to Discord
										</a>
									)
								}
							/>

							<Button
								className="mt-8"
								type="submit"
								name="actionId"
								value={actionIds.changeDetails}
							>
								Save changes
							</Button>
						</Form>
					</div>

					<div className="col-span-full lg:col-span-4 lg:col-start-8">
						<div className="flex justify-between gap-2 align-bottom">
							<Label className="mb-4" htmlFor="chosen-team">
								Chosen team
							</Label>
							<a
								className="underlined mb-5 animate-pulse text-lg hover:animate-none focus:animate-none"
								href="https://kcd.im/shirts"
							>
								Get your team shirt 👕
							</a>
						</div>

						<input
							className="sr-only"
							type="radio"
							name="team"
							value={team}
							checked
							readOnly
						/>

						<div className="ring-team-current ring-offset-team-current relative col-span-full mb-3 rounded-lg bg-gray-100 ring-2 ring-offset-4 focus-within:ring-2 focus-within:outline-none lg:col-span-4 lg:mb-0 dark:bg-gray-800">
							<span className="text-team-current absolute top-9 left-9">
								<CheckCircledIcon />
							</span>

							<div className="block px-12 pt-20 pb-12 text-center">
								<img
									className={clsx(
										'mb-16 block w-full',
										teamMap[team].image.className,
									)}
									src={teamMap[team].image()}
									alt={teamMap[team].image.alt}
									style={teamMap[team].image.style}
								/>
								<H6 as="span">{teamMap[team].label}</H6>
							</div>
						</div>
					</div>
				</Grid>
			</div>

			<Grid>
				<div className="col-span-full mb-12">
					<H2>Log in on another device</H2>
					<H2 variant="secondary" as="p">
						Use your password, or set up a passkey for easier sign-in.
					</H2>
				</div>
			</Grid>

			<Spacer size="sm" />

			<Grid>
				<div className="col-span-full mb-12">
					<H2>Your favorites</H2>
					<H2 variant="secondary" as="p">
						Save things you want to revisit.
					</H2>
				</div>
				{data.favorites.length ? (
					<ul className="col-span-full space-y-4">
						{data.favorites.map((favorite) => (
							<li
								key={`${favorite.contentType}:${favorite.contentId}`}
								className="border-b border-gray-200 pb-4 dark:border-gray-600"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<Link
											to={favorite.href}
											className="underlined text-primary hover:text-team-current focus:text-team-current block truncate text-lg font-medium focus:outline-none"
										>
											{favorite.title}
										</Link>
										<p className="text-secondary mt-1 text-sm">
											{favorite.subtitle}
										</p>
									</div>
									<FavoriteToggle
										mode="icon"
										contentType={favorite.contentType}
										contentId={favorite.contentId}
										initialIsFavorite={true}
										className="flex-none"
									/>
								</div>
							</li>
						))}
					</ul>
				) : (
					<Paragraph className="col-span-full">
						No favorites yet. Open a blog post, talk, or podcast episode and hit
						the star.
					</Paragraph>
				)}
			</Grid>

			<Spacer size="sm" />

			<Grid>
				<div className="col-span-full mb-12">
					<H2>Your Call Kent episodes</H2>
					<H2 variant="secondary" as="p">
						Episodes where you're the caller.
					</H2>
				</div>
				{data.callKentCallerEpisodes.length ? (
					<ul className="col-span-full space-y-4">
						{data.callKentCallerEpisodes.map((episode) => (
							<li
								key={episode.id}
								className="border-b border-gray-200 pb-4 dark:border-gray-600"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<Link
											to={episode.episodePath}
											className="underlined text-primary hover:text-team-current focus:text-team-current block truncate text-lg font-medium focus:outline-none"
										>
											{episode.episodeTitle}
										</Link>
										<p className="text-secondary mt-1 text-sm">
											{typeof episode.seasonNumber === 'number' &&
											typeof episode.episodeNumber === 'number'
												? `Calls — Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`
												: 'Calls — episode unavailable'}
											{episode.isAnonymous ? ' • anonymous' : ''}
										</p>
									</div>
									{episode.imageUrl ? (
										<img
											alt=""
											src={episode.imageUrl}
											className="h-12 w-12 flex-none rounded-lg object-cover"
											loading="lazy"
										/>
									) : null}
								</div>
							</li>
						))}
					</ul>
				) : (
					<div className="col-span-full rounded-lg bg-gray-100 p-8 dark:bg-gray-800">
						<Paragraph className="mb-4 text-gray-500 dark:text-slate-500">
							{`No episodes yet. Record a call and Kent might answer it on the podcast.`}
						</Paragraph>
						<ButtonLink to="/calls/record/new">{`Record a call`}</ButtonLink>
					</div>
				)}
			</Grid>

			<Spacer size="sm" />

			<Grid>
				<div className="col-span-full">
					<H2>Manage Your Account</H2>
				</div>
				<Spacer size="3xs" className="col-span-full" />
				<div className="col-span-full flex flex-wrap gap-3">
					<ButtonLink
						variant="secondary"
						download="my-kcd-data.json"
						href={`${requestInfo.origin}/me/download.json`}
					>
						Download Your Data
					</ButtonLink>
					<ButtonLink variant="secondary" to="passkeys">
						Manage Passkeys
					</ButtonLink>
					<ButtonLink variant="secondary" to="password">
						Password
					</ButtonLink>
					<Form
						action="/me"
						method="POST"
						noValidate
						aria-describedby="general-error"
					>
						<Button
							disabled={otherSessionsCount < 1}
							variant="danger"
							type="submit"
							name="actionId"
							value={actionIds.deleteSessions}
						>
							Sign out of {otherSessionsCount}{' '}
							{otherSessionsCount === 1 ? 'session' : 'sessions'}
						</Button>
					</Form>
					<Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
						Delete Account
					</Button>
				</div>
			</Grid>

			<Dialog
				onDismiss={() => setDeleteModalOpen(false)}
				isOpen={deleteModalOpen}
				aria-label="Delete your account"
				className="!w-11/12 rounded-lg border-2 border-black lg:!max-w-screen-lg lg:!px-24 lg:!py-14 dark:border-white dark:!bg-gray-900"
			>
				<H3>Delete your KCD Account</H3>
				<Paragraph>
					{`Are you certain you want to do this? There's no going back.`}
				</Paragraph>
				<Spacer size="2xs" />
				<Form
					action="/me"
					method="POST"
					noValidate
					aria-describedby="general-error"
				>
					<div className="flex flex-wrap gap-4">
						<Button type="button" onClick={() => setDeleteModalOpen(false)}>
							Nevermind
						</Button>
						<Button
							variant="danger"
							name="actionId"
							value={actionIds.deleteAccount}
							size="medium"
							type="submit"
						>
							Delete Account
						</Button>
					</div>
				</Form>
			</Dialog>
		</main>
	)
}

export default YouScreen
