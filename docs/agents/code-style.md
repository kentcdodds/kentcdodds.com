# Code style

Apply these rules to all new or edited code. When in doubt, match the existing
file style first, then run the formatter.

## Function forms

- Prefer function declarations for named, reusable functions.
- Use arrow functions for callbacks and inline handlers.
- Use object method shorthand for multi-line object methods.

## Array types

- Prefer `Array<T>` and `ReadonlyArray<T>` over `T[]`.
- This avoids precedence pitfalls in union types and keeps type reads clearer.

## Exports

- Prefer named exports.
- Use default exports only when a framework contract requires them.

## Imports

- Prefer repo-root `#...` imports (configured via `package.json` `"imports"`)
  over parent-relative `../...` paths.
- Keep `./...` imports for same-folder files.
- Generated files (for example `types/worker-configuration.d.ts`) are allowed to
  be exceptions; do not edit them by hand.

## Type conventions

- Prefer `type` aliases for object shapes and unions.
- Use `interface` only when you need declaration merging or public extension
  points.
- Prefer inline type definitions in parameters over named types unless sharing
  is necessary. When a one-off named type is useful, consider `Parameters<>` (or
  similar utility types) instead.
- Use `satisfies` when exporting objects that must match framework contracts.

## Absence values

- Use `null` for explicit "no value" in local state or API responses.
- Use `undefined` for optional or omitted fields, and avoid mixing within one
  API.

## References

- https://kentcdodds.com/blog/function-forms
- https://tkdodo.eu/blog/array-types-in-type-script
