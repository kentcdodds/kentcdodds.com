import dns from 'dns'
import fs from 'fs'
import path from 'path'

let connected: boolean | null = null

async function isConnectedToTheInternet() {
  if (connected === null) {
    connected = await new Promise(resolve => {
      dns.lookupService('8.8.8.8', 53, err => {
        resolve(!err)
      })
    })
  }
  return connected
}

const mswDataPath = path.join(__dirname, `./msw.local.json`)

// !! side effect !!
const clearingFixture = fs.promises.writeFile(mswDataPath, '{}')

export async function updateFixture(updates: Record<string, unknown>) {
  const mswData = await readFixture()
  await fs.promises.writeFile(
    mswDataPath,
    JSON.stringify({...mswData, ...updates}, null, 2),
  )
}

export async function readFixture() {
  await clearingFixture
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mswData: Record<string, any> = {}
  try {
    const contents = await fs.promises.readFile(mswDataPath)
    mswData = JSON.parse(contents.toString())
  } catch (error: unknown) {
    console.error(
      `Error reading and parsing the msw fixture. Clearing it.`,
      (error as {stack?: string}).stack ?? error,
    )
    await fs.promises.writeFile(mswDataPath, '{}')
  }
  return mswData
}

function requiredParam(params: URLSearchParams, param: string) {
  if (!params.get(param)) {
    const paramsString = JSON.stringify(
      Object.fromEntries(params.entries()),
      null,
      2,
    )
    throw new Error(
      `Param "${param}" required, but not found in ${paramsString}`,
    )
  }
}

function requiredHeader(headers: Headers, header: string) {
  if (!headers.get(header)) {
    const headersString = JSON.stringify(
      Object.fromEntries(headers.entries()),
      null,
      2,
    )
    throw new Error(
      `Header "${header}" required, but not found in ${headersString}`,
    )
  }
}

function requiredProperty(object: {[key: string]: unknown}, property: string) {
  if (!object[property]) {
    const objectString = JSON.stringify(object)
    throw new Error(
      `Property "${property}" required, but not found in ${objectString}`,
    )
  }
}

export {
  requiredParam,
  requiredHeader,
  requiredProperty,
  isConnectedToTheInternet,
}
