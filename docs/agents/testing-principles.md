# Testing principles

This codebase favors small, readable tests with explicit setup and minimal
magic.

## Principles

- Prefer flat test files: use top-level `test(...)` and avoid `describe`
  nesting.
- Avoid shared setup like `beforeEach`/`afterEach`; inline setup per test.
- Don't write tests for what the type system already guarantees.
- Use disposable objects only when there is real cleanup. If no cleanup, skip
  `using` and `Symbol.dispose`.
- For setup-only `using` bindings, name variables with an `ignored` prefix so
  `@typescript-eslint/no-unused-vars` accepts intentional non-reads.
- Build helpers that return ready-to-run objects (factory pattern), not globals.
- Keep test intent obvious in the name: "auth handler returns 400 for invalid
  JSON".
- Write tests so they could run offline if necessary: avoid relying on the
  public internet and third-party services; prefer local fakes/fixtures.
- Prefer fast unit tests for server logic; keep e2e tests focused on journeys.
- Run server tests with `bun test server` to avoid Playwright spec discovery.
- In backend Vitest tests, modules that transitively import `cache.server.ts`
  may require mocking `../cache.server.ts` first; otherwise `vite-env-only`
  macros (for `serverOnly$` route exports) can fail to transform in Node test
  runs.

## Examples

### Setup-only `using` bindings

When the disposable is needed only for side-effects (like env restoration), use
an `ignored` prefix for the binding name:

```ts
import { test, expect } from 'bun:test'
import { setEnv } from '#tests/env-disposable.ts'

test('reads env var', () => {
	using ignoredEnv = setEnv({ MY_VAR: 'hello' })
	expect(process.env.MY_VAR).toBe('hello')
})
```

### `Symbol.dispose` with `using`

```ts
import { test, expect } from 'bun:test'

const createTempFile = () => {
	const path = `/tmp/test-${crypto.randomUUID()}.txt`
	Bun.write(path, 'hello')

	return {
		path,
		[Symbol.dispose]: () => {
			try {
				Bun.file(path).delete()
			} catch {
				// Cleanup should never fail the test.
			}
		},
	}
}

test('reads a temp file', () => {
	using tempFile = createTempFile()
	const contents = Bun.file(tempFile.path).text()
	return contents.then((text) => expect(text).toBe('hello'))
})
```

### `Symbol.asyncDispose` with `await using`

```ts
import { test, expect } from 'bun:test'

const createDisposableServer = async () => {
	const server = Bun.serve({
		port: 0,
		fetch: () => new Response('ok'),
	})

	return {
		url: `http://localhost:${server.port}`,
		[Symbol.asyncDispose]: async () => {
			await server.stop()
		},
	}
}

test('fetches from a disposable server', async () => {
	await using server = await createDisposableServer()
	const response = await fetch(server.url)
	expect(await response.text()).toBe('ok')
})
```
