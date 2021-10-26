import dns from 'dns'
import fs from 'fs'
import type {ResponseTransformer} from 'msw'
import path from 'path'

const isE2E = process.env.RUNNING_E2E === 'true'

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

// @ts-expect-error we've got patch-package to silence the warning
// https://github.com/mswjs/msw/pull/923
const forward = (): ResponseTransformer => () => {}

async function updateFixture(updates: Record<string, unknown>) {
  const mswDataPath = path.join(__dirname, `./msw.local.json`)
  let mswData = {}
  try {
    const contents = await fs.promises.readFile(mswDataPath)
    mswData = JSON.parse(contents.toString())
  } catch (error: unknown) {
    console.error(
      `Error reading and parsing the msw fixture. Clearing it.`,
      (error as {stack?: string}).stack ?? error,
    )
  }
  await fs.promises.writeFile(
    mswDataPath,
    JSON.stringify({...mswData, ...updates}, null, 2),
  )
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
  isE2E,
  forward,
  updateFixture,
  requiredParam,
  requiredHeader,
  requiredProperty,
  isConnectedToTheInternet,
}
