/**
 * Multiline SQL → single line for D1 {@link D1Database#exec}.
 * D1 only executes the first line of multi-line strings.
 *
 * For static SQL only. Never interpolate user input — use `prepare()` + `?`.
 */
export function sql(
	strings: TemplateStringsArray,
	...values: Array<string>
): string {
	const joined = strings.reduce(
		(result, str, i) => result + str + (values[i] ?? ''),
		'',
	)
	return joined
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ')
}
