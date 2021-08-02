type Timings = Record<string, number>

async function time<ReturnType>(
  name: string,
  fn: () => Promise<ReturnType>,
  timings?: Timings,
): Promise<ReturnType> {
  if (!timings) return fn()

  const start = performance.now()
  const result = await fn()
  timings[name] = performance.now() - start
  return result
}

export {time}
export type {Timings}
