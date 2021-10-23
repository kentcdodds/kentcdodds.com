import {PrismaClient} from '@prisma/client'
import chalk from 'chalk'
import type {User, Session} from '~/types'
import {encrypt, decrypt} from './encryption.server'
import {getRequiredServerEnvVar} from './misc'

declare global {
  // This prevents us from making multiple connections to the db when the
  // require cache is cleared.
  // eslint-disable-next-line
  var prismaRead: ReturnType<typeof getClient> | undefined
  // eslint-disable-next-line
  var prismaWrite: ReturnType<typeof getClient> | undefined
}

const DATABASE_URL = getRequiredServerEnvVar('DATABASE_URL')
const regionalDB = new URL(DATABASE_URL)
const primaryDB = new URL(DATABASE_URL)

// Need a lot more than the default of 3 connections for this app.
const totalConnections = 100
regionalDB.searchParams.set('connection_limit', totalConnections.toString())
const totalRegions = 7
primaryDB.searchParams.set(
  'connection_limit',
  Math.floor(totalConnections / totalRegions).toString(),
)

const isLocalHost = regionalDB.hostname === 'localhost'
const PRIMARY_REGION = isLocalHost
  ? null
  : getRequiredServerEnvVar('PRIMARY_REGION')

const FLY_REGION = isLocalHost ? null : getRequiredServerEnvVar('FLY_REGION')
const isPrimaryRegion = PRIMARY_REGION === FLY_REGION
if (!isLocalHost) {
  regionalDB.host = `${FLY_REGION}.${regionalDB.host}`
  primaryDB.host = `${PRIMARY_REGION}.${primaryDB.host}`
  if (!isPrimaryRegion) {
    // 5433 is the read-replica port
    regionalDB.port = '5433'
  }
}

const logThreshold = 50

const prismaRead =
  global.prismaRead ?? (global.prismaRead = getClient(regionalDB, 'read'))
const prismaWrite =
  global.prismaWrite ?? (global.prismaWrite = getClient(primaryDB, 'write'))

function getClient(connectionUrl: URL, type: 'write' | 'read'): PrismaClient {
  console.log(`Setting up prisma client to ${connectionUrl.host} for ${type}`)
  // NOTE: during development if you change anything in this function, remember
  // that this only runs once per server restart and won't automatically be
  // re-run per request like everything else is.
  const client = new PrismaClient({
    log: [
      {level: 'query', emit: 'event'},
      {level: 'error', emit: 'stdout'},
      {level: 'info', emit: 'stdout'},
      {level: 'warn', emit: 'stdout'},
    ],
    datasources: {
      db: {
        url: connectionUrl.toString(),
      },
    },
  })
  client.$on('query', e => {
    if (e.duration < logThreshold) return

    const color =
      e.duration < 30
        ? 'green'
        : e.duration < 50
        ? 'blue'
        : e.duration < 80
        ? 'yellow'
        : e.duration < 100
        ? 'redBright'
        : 'red'
    const dur = chalk[color](`${e.duration}ms`)
    console.log(`prisma:query - ${dur} - ${e.query}`)
  })
  // make the connection eagerly so the first request doesn't have to wait
  void client.$connect()
  return client
}

const isProd = process.env.NODE_ENV === 'production'

if (!isProd && !isLocalHost) {
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
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 365
const magicLinkSearchParam = 'kodyKey'

type MagicLinkPayload = {
  emailAddress: string
  creationDate: string
  validateSessionMagicLink: boolean
}

function getMagicLink({
  emailAddress,
  validateSessionMagicLink,
  domainUrl,
}: {
  emailAddress: string
  validateSessionMagicLink: boolean
  domainUrl: string
}) {
  const payload: MagicLinkPayload = {
    emailAddress,
    validateSessionMagicLink,
    creationDate: new Date().toISOString(),
  }
  const stringToEncrypt = JSON.stringify(payload)
  const encryptedString = encrypt(stringToEncrypt)
  const url = new URL(domainUrl)
  url.pathname = 'magic'
  url.searchParams.set(magicLinkSearchParam, encryptedString)
  return url.toString()
}

function getMagicLinkCode(link: string) {
  try {
    const url = new URL(link)
    return url.searchParams.get(magicLinkSearchParam) ?? ''
  } catch {
    return ''
  }
}

async function validateMagicLink(link: string, sessionMagicLink?: string) {
  const linkCode = getMagicLinkCode(link)
  const sessionLinkCode = sessionMagicLink
    ? getMagicLinkCode(sessionMagicLink)
    : null
  let emailAddress, linkCreationDateString, validateSessionMagicLink
  try {
    const decryptedString = decrypt(linkCode)
    const payload = JSON.parse(decryptedString) as MagicLinkPayload
    emailAddress = payload.emailAddress
    linkCreationDateString = payload.creationDate
    validateSessionMagicLink = payload.validateSessionMagicLink
  } catch (error: unknown) {
    console.error(error)
    throw new Error('Sign in link invalid. Please request a new one.')
  }

  if (typeof emailAddress !== 'string') {
    console.error(`Email is not a string. Maybe wasn't set in the session?`)
    throw new Error('Sign in link invalid. Please request a new one.')
  }

  if (validateSessionMagicLink) {
    if (!sessionLinkCode) {
      console.error(
        'Must validate session magic link but no session link provided',
      )
      throw new Error('Sign in link invalid. Please request a new one.')
    }
    if (linkCode !== sessionLinkCode) {
      console.error(`Magic link does not match sessionMagicLink`)
      throw new Error(
        `You must open the magic link on the same device it was created from for security reasons. Please request a new link.`,
      )
    }
  }

  if (typeof linkCreationDateString !== 'string') {
    console.error('Link expiration is not a string.')
    throw new Error('Sign in link invalid. Please request a new one.')
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
  return prismaWrite.session.create({
    data: {
      ...sessionData,
      expirationDate: new Date(Date.now() + sessionExpirationTime),
    },
  })
}

async function getUserFromSessionId(sessionId: string) {
  const session = await prismaRead.session.findUnique({
    where: {id: sessionId},
    include: {user: true},
  })
  if (!session) {
    throw new Error('No user found')
  }

  if (Date.now() > session.expirationDate.getTime()) {
    await prismaWrite.session.delete({where: {id: sessionId}})
    throw new Error('Session expired. Please request a new magic link.')
  }

  // if there's less than ~six months left, extend the session
  const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6
  if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
    const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
    await prismaWrite.session.update({
      data: {expirationDate: newExpirationDate},
      where: {id: sessionId},
    })
  }

  return session.user
}

function getUserByEmail(email: string) {
  return prismaRead.user.findUnique({where: {email}})
}

async function deleteUser(userId: string) {
  return prismaWrite.user.delete({where: {id: userId}})
}

async function getAllUserData(userId: string) {
  const {default: pProps} = await import('p-props')
  return pProps({
    user: prismaRead.user.findUnique({where: {id: userId}}),
    calls: prismaRead.call.findMany({where: {userId}}),
    postReads: prismaRead.postRead.findMany({where: {userId}}),
    sessions: prismaRead.session.findMany({where: {userId}}),
  })
}

function updateUser(
  userId: string,
  updatedInfo: Omit<
    Partial<User>,
    'id' | 'email' | 'team' | 'createdAt' | 'updatedAt'
  >,
) {
  return prismaWrite.user.update({where: {id: userId}, data: updatedInfo})
}

async function addPostRead({
  slug,
  userId,
  clientId,
}: {slug: string} & (
  | {userId: string; clientId?: undefined}
  | {userId?: undefined; clientId: string}
)) {
  const id = userId ? {userId} : {clientId}
  const readInLastWeek = await prismaRead.postRead.findFirst({
    select: {id: true},
    where: {
      ...id,
      postSlug: slug,
      createdAt: {gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)},
    },
  })
  if (readInLastWeek) {
    return null
  } else {
    const postRead = await prismaWrite.postRead.create({
      data: {postSlug: slug, ...id},
      select: {id: true},
    })
    return postRead
  }
}

export {
  prismaRead,
  prismaWrite,
  getMagicLink,
  validateMagicLink,
  linkExpirationTime,
  sessionExpirationTime,
  createSession,
  getUserFromSessionId,
  getUserByEmail,
  updateUser,
  deleteUser,
  getAllUserData,
  addPostRead,
}
