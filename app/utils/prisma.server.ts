import {PrismaClient} from '@prisma/client'
import type {Session} from '~/types'
import {encrypt, decrypt} from './encryption.server'
import {ensurePrimary} from 'litefs-js/remix'
import type {Timings} from './timing.server'
import {time} from './timing.server'

declare global {
  // This prevents us from making multiple connections to the db when the
  // require cache is cleared.
  // eslint-disable-next-line
  var __prisma: ReturnType<typeof getClient> | undefined
}

const logThreshold = 500

const prisma = global.__prisma ?? (global.__prisma = getClient())

function getClient(): PrismaClient {
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
  })
  client.$on('query', async e => {
    if (e.duration < logThreshold) return
    const {default: chalk} = await import('chalk')

    const color =
      e.duration < logThreshold * 1.1
        ? 'green'
        : e.duration < logThreshold * 1.2
        ? 'blue'
        : e.duration < logThreshold * 1.3
        ? 'yellow'
        : e.duration < logThreshold * 1.4
        ? 'redBright'
        : 'red'
    const dur = chalk[color](`${e.duration}ms`)
    console.info(`prisma:query - ${dur} - ${e.query}`)
  })
  // make the connection eagerly so the first request doesn't have to wait
  void client.$connect()
  return client
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
  await ensurePrimary()
  return prisma.session.create({
    data: {
      ...sessionData,
      expirationDate: new Date(Date.now() + sessionExpirationTime),
    },
  })
}

async function getUserFromSessionId(
  sessionId: string,
  {timings}: {timings?: Timings} = {},
) {
  const session = await time(
    prisma.session.findUnique({
      where: {id: sessionId},
      include: {user: true},
    }),
    {timings, type: 'getUserFromSessionId'},
  )
  if (!session) {
    throw new Error('No user found')
  }

  if (Date.now() > session.expirationDate.getTime()) {
    await ensurePrimary()
    await prisma.session.delete({where: {id: sessionId}})
    throw new Error('Session expired. Please request a new magic link.')
  }

  // if there's less than ~six months left, extend the session
  const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6
  if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
    await ensurePrimary()
    const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
    await prisma.session.update({
      data: {expirationDate: newExpirationDate},
      where: {id: sessionId},
    })
  }

  return session.user
}

async function getAllUserData(userId: string) {
  const {default: pProps} = await import('p-props')
  return pProps({
    user: prisma.user.findUnique({where: {id: userId}}),
    calls: prisma.call.findMany({where: {userId}}),
    postReads: prisma.postRead.findMany({where: {userId}}),
    sessions: prisma.session.findMany({where: {userId}}),
  })
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
  const readInLastWeek = await prisma.postRead.findFirst({
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
    const postRead = await prisma.postRead.create({
      data: {postSlug: slug, ...id},
      select: {id: true},
    })
    return postRead
  }
}

export {
  prisma,
  getMagicLink,
  validateMagicLink,
  linkExpirationTime,
  sessionExpirationTime,
  createSession,
  getUserFromSessionId,
  getAllUserData,
  addPostRead,
}
