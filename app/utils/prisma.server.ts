import {PrismaClient} from '@prisma/client'
import type {Request, Response, EntryContext} from 'remix'
import {redirect} from 'remix'
import type {User, Session} from 'types'
import {encrypt, decrypt} from './encryption.server'
import {getRequiredServerEnvVar} from './misc'

declare global {
  // This prevents us from making multiple connections to the db when the
  // require cache is cleared.
  // eslint-disable-next-line
  var prisma: PrismaClient | undefined
}

const DATABASE_URL = getRequiredServerEnvVar('DATABASE_URL')
const regionalDB = new URL(DATABASE_URL)
const isLocalHost = regionalDB.hostname === 'localhost'
const PRIMARY_REGION = isLocalHost
  ? null
  : getRequiredServerEnvVar('PRIMARY_REGION')

const FLY_REGION = isLocalHost ? null : getRequiredServerEnvVar('FLY_REGION')
const isPrimaryRegion = PRIMARY_REGION === FLY_REGION
if (!isLocalHost) {
  if (!isPrimaryRegion) {
    // 5433 is the read-replica port
    regionalDB.port = '5433'
    regionalDB.host = `${FLY_REGION}.${regionalDB.host}`
  }
}

const prisma = getClient(
  () =>
    new PrismaClient({
      datasources: {
        db: {
          url: regionalDB.toString(),
        },
      },
    }),
)

function getClient(createClient: () => PrismaClient): PrismaClient {
  let client = global.prisma
  if (!client) {
    // eslint-disable-next-line no-multi-assign
    client = global.prisma = createClient()
  }
  return client
}

const isProd = process.env.NODE_ENV === 'production'

if (!isProd && DATABASE_URL && !DATABASE_URL.includes('localhost')) {
  // if we're connected to a non-localhost db, let's make
  // sure we know it.
  const domain = new URL(DATABASE_URL)
  if (domain.password) {
    domain.password = '**************'
  }
  console.warn(
    `
⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️
Connected to non-localhost DB in dev mode:
  ${domain.toString()}
⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️
    `.trim(),
  )
}

const linkExpirationTime = 1000 * 60 * 30
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 30
const magicLinkSearchParam = 'kodyKey'

type MagicLinkPayload = {
  emailAddress: string
  creationDate: string
}

function getMagicLink({
  emailAddress,
  domainUrl,
}: {
  emailAddress: string
  domainUrl: string
}) {
  const payload: MagicLinkPayload = {
    emailAddress,
    creationDate: new Date().toISOString(),
  }
  const stringToEncrypt = JSON.stringify(payload)
  const encryptedString = encrypt(stringToEncrypt)
  const url = new URL(domainUrl)
  url.pathname = 'magic'
  url.searchParams.set(magicLinkSearchParam, encryptedString)
  return url.toString()
}

async function validateMagicLink(link: string) {
  let emailAddress, linkCreationDateString
  try {
    const url = new URL(link)
    const encryptedString = url.searchParams.get(magicLinkSearchParam) ?? '[]'
    const decryptedString = decrypt(encryptedString)
    const payload = JSON.parse(decryptedString) as MagicLinkPayload
    emailAddress = payload.emailAddress
    linkCreationDateString = payload.creationDate
  } catch (error: unknown) {
    console.error(error)
    throw new Error('Invalid magic link.')
  }

  if (typeof emailAddress !== 'string') {
    console.error(`Email is not a string. Maybe wasn't set in the session?`)
    throw new Error('Invalid magic link.')
  }

  if (typeof linkCreationDateString !== 'string') {
    console.error('Link expiration is not a string.')
    throw new Error('Invalid magic link.')
  }

  const linkCreationDate = new Date(linkCreationDateString)
  const expirationTime = linkCreationDate.getTime() + linkExpirationTime
  if (Date.now() > expirationTime) {
    throw new Error('Magic link expired. Please request a new one.')
  }
  return emailAddress
}

async function createSession(
  sessionData: Omit<Session, 'id' | 'expirationDate' | 'createdAt'>,
) {
  return prisma.session.create({
    data: {
      ...sessionData,
      expirationDate: new Date(Date.now() + sessionExpirationTime),
    },
  })
}

async function getUserFromSessionId(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: {id: sessionId},
    include: {user: true},
  })
  if (!session) {
    throw new Error('No user found')
  }

  if (Date.now() > session.expirationDate.getTime()) {
    await prisma.session.delete({where: {id: sessionId}})
    throw new Error('Session expired. Please request a new magic link.')
  }

  // if there's less than two weeks left, extend the session
  const twoWeeks = 2 * 7 * 24 * 60 * 60 * 1000
  if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
    const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
    await prisma.session.update({
      data: {expirationDate: newExpirationDate},
      where: {id: sessionId},
    })
  }

  return session.user
}

function getUserByEmail(email: string) {
  return prisma.user.findUnique({where: {email}})
}

function updateUser(
  userId: string,
  updatedInfo: Omit<
    Partial<User>,
    'id' | 'email' | 'team' | 'createdAt' | 'updatedAt'
  >,
) {
  return prisma.user.update({where: {id: userId}, data: updatedInfo})
}

async function addPostRead({slug, userId}: {slug: string; userId: string}) {
  const readInLastWeek = await prisma.postRead.findFirst({
    select: {id: true},
    where: {
      userId,
      postSlug: slug,
      createdAt: {gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)},
    },
  })
  if (readInLastWeek) {
    return null
  } else {
    const postRead = await prisma.postRead.create({
      data: {postSlug: slug, userId},
      select: {id: true},
    })
    return postRead
  }
}

function getReplayResponse(request: Request, errorMessage?: string) {
  // depending on how the error is serialized, there may be quotes and escape
  // characters in the error message, so we'll use a regex instead of a regular includes.
  const isReadOnlyError = /SqlState\(.*?25006.*?\)/.test(errorMessage ?? '')
  if (!isPrimaryRegion && isReadOnlyError) {
    const pathname = new URL(request.url).pathname
    const logInfo = {
      pathname,
      method: request.method,
      PRIMARY_REGION,
      FLY_REGION,
    }
    console.info(`Replaying:`, logInfo)
    return redirect(pathname, {
      status: 409,
      headers: {'fly-replay': `region=${PRIMARY_REGION}`},
    })
  }
  return null
}

async function getDocumentReplayResponse(
  request: Request,
  remixContext: EntryContext,
) {
  return getReplayResponse(
    request,
    remixContext.componentDidCatchEmulator.error?.message,
  )
}

async function getDataReplayResponse(request: Request, response: Response) {
  if (response.status > 199 && response.status < 300) return null

  const textClone = response.clone()
  const text = await textClone.text().catch(() => null)
  return getReplayResponse(request, text ?? '')
}

export {
  prisma,
  getMagicLink,
  validateMagicLink,
  linkExpirationTime,
  sessionExpirationTime,
  createSession,
  getUserFromSessionId,
  getUserByEmail,
  updateUser,
  addPostRead,
  getDocumentReplayResponse,
  getDataReplayResponse,
}
