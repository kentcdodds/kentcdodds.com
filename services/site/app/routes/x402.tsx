import * as React from 'react'
import { data as json, type MetaFunction } from 'react-router'
import { Button, ButtonLink, LinkButton } from '#app/components/button.tsx'
import { ClipboardIcon, CodeIcon, CopyIcon } from '#app/components/icons.tsx'
import { Grid } from '#app/components/grid.tsx'
import { H1, H2, H3, Paragraph } from '#app/components/typography.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { getDisplayUrl, getUrl } from '#app/utils/misc.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getX402PublicConfig } from '#app/utils/x402.server.ts'
import { type Route } from './+types/x402'

type DemoProbeResult =
	| {
			kind: 'idle'
	  }
	| {
			kind: 'loading'
	  }
	| {
			kind: 'challenge'
			status: number
			headerValue: string
			decodedHeader: string
			contentType: string | null
			body: string
	  }
	| {
			kind: 'success'
			status: number
			contentType: string | null
			body: string
	  }
	| {
			kind: 'error'
			message: string
	  }

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: 'x402 payments demo',
		description:
			'See how agent-native HTTP 402 payment challenges work on kentcdodds.com.',
		keywords: 'x402, payment required, ai agents, http payments',
		url: getUrl(requestInfo),
		image: `https://og-image-react-egghead.vercel.app/${encodeURIComponent(
			getDisplayUrl(requestInfo),
		)}?title=${encodeURIComponent('x402 payments demo')}`,
	})
}

export async function loader({ request }: Route.LoaderArgs) {
	const requestUrl = new URL(request.url)
	const origin = requestUrl.origin
	const publicConfig = getX402PublicConfig()
	const apiPath = publicConfig.path
	const apiUrl = new URL(apiPath, origin).toString()

	return json({
		x402: {
			...publicConfig,
			apiPath,
			apiUrl,
			curlCommand: `curl -i ${JSON.stringify(apiUrl)}`,
			curlCommandWithAcceptHeader: `curl -i -H ${JSON.stringify(
				'Accept: application/json',
			)} ${JSON.stringify(apiUrl)}`,
			testRequestHeaders: {
				Accept: 'application/json',
				'x-demo-client': 'human-browser',
			},
		},
		requestPath: requestUrl.pathname,
	})
}

function decodePaymentRequiredHeader(headerValue: string) {
	try {
		if (typeof window === 'undefined') {
			return Buffer.from(headerValue, 'base64').toString('utf8')
		}
		const binary = window.atob(headerValue)
		const bytes = Uint8Array.from(binary, (character) =>
			character.charCodeAt(0),
		)
		return new TextDecoder().decode(bytes)
	} catch (error) {
		return `Unable to decode PAYMENT-REQUIRED header: ${
			error instanceof Error ? error.message : String(error)
		}`
	}
}

function prettyText(value: string) {
	try {
		return JSON.stringify(JSON.parse(value), null, 2)
	} catch {
		return value
	}
}

function StatusPill({
	enabled,
	children,
}: {
	enabled: boolean
	children: React.ReactNode
}) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
				enabled
					? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
					: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
			}`}
		>
			{children}
		</span>
	)
}

function InfoCard({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string
	title: string
	children: React.ReactNode
}) {
	return (
		<div className="col-span-full rounded-lg border border-gray-200 p-8 dark:border-gray-600 lg:col-span-4">
			<p className="mb-3 text-sm font-medium tracking-[0.18em] text-gray-500 uppercase dark:text-gray-400">
				{eyebrow}
			</p>
			<H3 as="h2" className="mb-4">
				{title}
			</H3>
			<div className="space-y-4 text-left">{children}</div>
		</div>
	)
}

function CodeBlock({
	title,
	code,
}: {
	title: string
	code: string
}) {
	const [copied, setCopied] = React.useState(false)

	async function handleCopy() {
		await navigator.clipboard.writeText(code)
		setCopied(true)
		window.setTimeout(() => setCopied(false), 1500)
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/70">
			<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
					<CodeIcon size={18} />
					<span>{title}</span>
				</div>
				<LinkButton
					type="button"
					className="inline-flex items-center gap-2 text-sm"
					onClick={handleCopy}
				>
					{copied ? <ClipboardIcon /> : <CopyIcon />}
					{copied ? 'Copied' : 'Copy'}
				</LinkButton>
			</div>
			<pre className="overflow-x-auto p-4 text-sm leading-6 text-gray-800 dark:text-gray-100">
				<code>{code}</code>
			</pre>
		</div>
	)
}

function ProbeOutput({ result }: { result: DemoProbeResult }) {
	if (result.kind === 'idle') {
		return (
			<Paragraph className="rounded-lg border border-dashed border-gray-300 p-6 dark:border-gray-600">
				Run the probe to see the live 402 challenge this endpoint returns before
				any payment is attached.
			</Paragraph>
		)
	}

	if (result.kind === 'loading') {
		return (
			<Paragraph className="rounded-lg border border-gray-200 p-6 dark:border-gray-600">
				Fetching the protected endpoint now...
			</Paragraph>
		)
	}

	if (result.kind === 'error') {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
				<H3 as="h3" className="mb-3 text-red-700 dark:text-red-300">
					Probe failed
				</H3>
				<Paragraph prose={false} textColorClassName="text-red-700 dark:text-red-200">
					{result.message}
				</Paragraph>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-gray-200 p-6 dark:border-gray-600">
				<H3 as="h3" className="mb-4">
					Latest response
				</H3>
				<dl className="grid gap-4 md:grid-cols-3">
					<div>
						<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
							Status
						</dt>
						<dd className="mt-2 text-lg font-medium text-black dark:text-white">
							{result.status}
						</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
							Content-Type
						</dt>
						<dd className="mt-2 break-all text-lg font-medium text-black dark:text-white">
							{result.contentType ?? 'not set'}
						</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
							Meaning
						</dt>
						<dd className="mt-2 text-lg font-medium text-black dark:text-white">
							{result.kind === 'challenge'
								? 'Payment required'
								: 'Response returned'}
						</dd>
					</div>
				</dl>
			</div>

			{result.kind === 'challenge' ? (
				<>
					<CodeBlock title="PAYMENT-REQUIRED header" code={result.headerValue} />
					<CodeBlock
						title="Decoded PAYMENT-REQUIRED JSON"
						code={prettyText(result.decodedHeader)}
					/>
				</>
			) : null}

			<CodeBlock title="Response body" code={prettyText(result.body)} />
		</div>
	)
}

export default function X402Route({ loaderData }: Route.ComponentProps) {
	const { x402 } = loaderData
	const [probeResult, setProbeResult] = React.useState<DemoProbeResult>({
		kind: 'idle',
	})

	const browserPaywallUrl = `${x402.apiPath}?human=1`
	const challengeHeaderName = 'payment-required'

	async function runProbe() {
		setProbeResult({ kind: 'loading' })

		try {
			const response = await fetch(x402.apiUrl, {
				headers: x402.testRequestHeaders,
			})
			const text = await response.text()
			const headerValue = response.headers.get(challengeHeaderName)

			if (response.status === 402 && headerValue) {
				setProbeResult({
					kind: 'challenge',
					status: response.status,
					headerValue,
					decodedHeader: decodePaymentRequiredHeader(headerValue),
					contentType: response.headers.get('content-type'),
					body: text,
				})
				return
			}

			setProbeResult({
				kind: 'success',
				status: response.status,
				contentType: response.headers.get('content-type'),
				body: text,
			})
		} catch (error) {
			setProbeResult({
				kind: 'error',
				message: error instanceof Error ? error.message : String(error),
			})
		}
	}

	return (
		<>
			<Grid as="main" className="mt-20 mb-16 gap-y-8 lg:mt-24 lg:mb-24">
				<div className="col-span-full lg:col-span-8">
					<StatusPill enabled={x402.enabled}>
						{x402.enabled ? 'x402 route enabled' : 'x402 route disabled'}
					</StatusPill>
					<H1 as="h1" className="mt-6 mb-6 max-w-4xl">
						x402 lets an API answer with HTTP 402 and tell an agent exactly how to
						pay for the next request.
					</H1>
					<Paragraph className="mb-6 max-w-3xl">
						Instead of creating an account, storing a card, or minting another API
						key, an agent makes a normal HTTP request, gets a machine-readable
						payment challenge, pays, and retries the same URL.
					</Paragraph>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Button type="button" onClick={runProbe} disabled={!x402.enabled}>
							Try the API challenge
						</Button>
						<ButtonLink
							to={browserPaywallUrl}
							variant="secondary"
							reload
							aria-disabled={!x402.enabled}
						>
							Open the browser paywall
						</ButtonLink>
					</div>
				</div>
				<div className="col-span-full rounded-lg border border-gray-200 p-8 dark:border-gray-600 lg:col-span-4">
					<H3 as="h2" className="mb-4">
						This page is showing
					</H3>
					<ul className="space-y-3 text-lg text-gray-700 dark:text-gray-200">
						<li>1. A protected JSON endpoint at `{x402.apiPath}`.</li>
						<li>2. The raw `PAYMENT-REQUIRED` challenge header it emits.</li>
						<li>3. A human-friendly path that opens the built-in x402 paywall.</li>
					</ul>
				</div>
			</Grid>

			<Grid className="mb-16 gap-y-6 lg:mb-24">
				<InfoCard eyebrow="Step 1" title="Request the protected URL">
					<Paragraph>
						An agent does a plain HTTP `GET` to the protected endpoint. No session,
						no checkout page, no API key exchange.
					</Paragraph>
					<CodeBlock title="curl probe" code={x402.curlCommandWithAcceptHeader} />
				</InfoCard>
				<InfoCard eyebrow="Step 2" title="Receive a 402 challenge">
					<Paragraph>
						The server answers with `402 Payment Required` plus a
						`PAYMENT-REQUIRED` header that includes price, network, and wallet
						destination.
					</Paragraph>
					<Paragraph prose={false}>
						This demo advertises:
						<br />
						price: <strong>{x402.price}</strong>
						<br />
						network: <strong>{x402.network}</strong>
					</Paragraph>
				</InfoCard>
				<InfoCard eyebrow="Step 3" title="Pay and retry">
					<Paragraph>
						An x402-aware client signs a payment payload, sends it in
						`PAYMENT-SIGNATURE`, and the exact same URL returns the premium data.
					</Paragraph>
					<Paragraph>
						Humans can also hit the browser paywall route to inspect the same
						requirements visually.
					</Paragraph>
				</InfoCard>
			</Grid>

			<Grid className="mb-16 gap-y-6 lg:mb-24">
				<div className="col-span-full lg:col-span-7">
					<H2 as="h2" className="mb-6">
						Live challenge
					</H2>
					<ProbeOutput result={probeResult} />
				</div>
				<div className="col-span-full space-y-6 lg:col-span-5">
					<div className="rounded-lg border border-gray-200 p-8 dark:border-gray-600">
						<H3 as="h3" className="mb-4">
							Endpoint details
						</H3>
						<dl className="space-y-4 text-lg">
							<div>
								<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Protected path
								</dt>
								<dd className="mt-1 break-all text-black dark:text-white">
									{x402.apiPath}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Facilitator
								</dt>
								<dd className="mt-1 break-all text-black dark:text-white">
									{x402.facilitatorUrl}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Wallet
								</dt>
								<dd className="mt-1 break-all text-black dark:text-white">
									{x402.walletAddress ?? 'Not configured'}
								</dd>
							</div>
						</dl>
					</div>

					<div className="rounded-lg border border-gray-200 p-8 dark:border-gray-600">
						<H3 as="h3" className="mb-4">
							Want the raw request?
						</H3>
						<Paragraph className="mb-4">
							The button uses `fetch` so you can inspect the browser result in-page,
							but this is the exact target:
						</Paragraph>
						<CodeBlock title="Endpoint URL" code={x402.apiUrl} />
					</div>
				</div>
			</Grid>

			<Grid className="mb-24 gap-y-6 lg:mb-32">
				<div className="col-span-full rounded-lg border border-gray-200 p-8 dark:border-gray-600">
					<H2 as="h2" className="mb-4">
						Why this matters for agents
					</H2>
					<Paragraph className="mb-6 max-w-4xl">
						Agents already know how to retry an HTTP request. x402 extends that
						pattern so the retry can include a payment instead of a new auth flow.
						That makes pay-per-call APIs much easier to expose to autonomous
						clients.
					</Paragraph>
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900/60">
							<H3 as="h3" className="mb-3">
								No prepaid credits
							</H3>
							<Paragraph>
								Clients can pay for exactly one call instead of managing a separate
								billing account.
							</Paragraph>
						</div>
						<div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900/60">
							<H3 as="h3" className="mb-3">
								Native HTTP semantics
							</H3>
							<Paragraph>
								The protocol uses standard HTTP status codes and headers, so it fits
								cleanly into existing API workflows.
							</Paragraph>
						</div>
						<div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900/60">
							<H3 as="h3" className="mb-3">
								Agent-friendly discovery
							</H3>
							<Paragraph>
								Once an agent sees a 402 challenge, it can programmatically decide
								whether to pay and continue.
							</Paragraph>
						</div>
					</div>
				</div>
			</Grid>
		</>
	)
}
