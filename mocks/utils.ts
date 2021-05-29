import fs from 'fs'
import path from 'path'

const isE2E = process.env.RUNNING_E2E === 'true'

async function updateFixture(updates: Record<string, unknown>) {
  const mswDataPath = path.join(__dirname, '../cypress/fixtures/msw.local.json')
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

export {isE2E, updateFixture}
