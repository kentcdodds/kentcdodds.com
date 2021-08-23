type Timings = Record<string, Array<{name: string; type: string; time: number}>>

async function time<ReturnType>({
  name,
  type,
  fn,
  timings,
}: {
  name: string
  type: string
  fn: () => ReturnType | Promise<ReturnType>
  timings?: Timings
}): Promise<ReturnType> {
  if (!timings) return fn()

  const start = performance.now()
  const result = await fn()
  type = type.replaceAll(' ', '_')
  let timingType = timings[type]
  if (!timingType) {
    // eslint-disable-next-line no-multi-assign
    timingType = timings[type] = []
  }

  timingType.push({name, type, time: performance.now() - start})
  return result
}

function getServerTimeHeader(timings: Timings) {
  console.dir({timings}, {color: true, depth: 6})
  return Object.entries(timings)
    .map(([key, timingInfos]) => {
      const dur = timingInfos
        .reduce((acc, timingInfo) => acc + timingInfo.time, 0)
        .toFixed(1)
      const desc = timingInfos.map(t => t.name).join(' & ')
      return `${key};dur=${dur};desc="${desc}"`
    })
    .join(',')
}

export {time, getServerTimeHeader}
export type {Timings}
