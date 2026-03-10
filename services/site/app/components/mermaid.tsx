import { Themed } from '#app/utils/theme.tsx'

export function MermaidDiagram({
	code,
	lightSvg,
	darkSvg,
}: {
	code: string
	lightSvg?: string
	darkSvg?: string
}) {
	return (
		<div className="mermaid not-prose" data-mermaid-diagram>
			<Themed
				light={<MermaidSvg code={code} svg={lightSvg} theme="light" />}
				dark={<MermaidSvg code={code} svg={darkSvg} theme="dark" />}
			/>
		</div>
	)
}

function MermaidSvg({
	code,
	svg,
	theme,
}: {
	code: string
	svg?: string
	theme: 'light' | 'dark'
}) {
	if (!svg) {
		return (
			<pre className="mermaid-fallback" data-theme={theme}>
				<code>{code}</code>
			</pre>
		)
	}

	// `dangerouslySetInnerHTML` is the whole point here: we want the <svg> to be
	// present in the server-rendered HTML, not generated client-side.
	return (
		<div
			className="mermaid-svg"
			data-theme={theme}
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	)
}
