import {PrismaClient} from '@prisma/client'
import type {User, Session} from 'types'
import {encrypt, decrypt} from './encryption.server'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      prisma?: PrismaClient
    }
  }
}

const prisma = new PrismaClient()

const linkExpirationTime = 1000 * 60 * 30
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 30

const isProd = process.env.NODE_ENV === 'production'

const {DATABASE_URL} = process.env
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

const magicLinkSearchParam = 'kodyKey'

type MagicLinkPayload = {
  emailAddress: string
  expirationDate: string
  validationRequired: boolean
}

function getMagicLink({
  emailAddress,
  domainUrl,
  validationRequired = true,
  expirationDate = new Date(Date.now() + linkExpirationTime).toISOString(),
}: {
  emailAddress: string
  domainUrl: string
  /**
   * This determines whether validating the magic link requires a validation
   * email address that matches the email address in the magic link code.
   * When true (the default), then calling "validateMagicLink" with this link
   * will check the email address in the magic link code matches the one given.
   * It's an extra layer of security to make certain that someone else doesn't
   * intercept a magic link.
   *
   * The QR Code is one situation where validation cannot work because by
   * definition the device requests the magic link is different from the one
   * that uses it.
   */
  validationRequired?: boolean
  expirationDate?: string
}) {
  const payload: MagicLinkPayload = {
    emailAddress,
    expirationDate,
    validationRequired,
  }
  const stringToEncrypt = JSON.stringify(payload)
  const encryptedString = encrypt(stringToEncrypt)
  const url = new URL(domainUrl)
  url.pathname = 'magic'
  url.searchParams.set(magicLinkSearchParam, encryptedString)
  return url.toString()
}

async function validateMagicLink(
  validationEmailAddress: string | null,
  link: string,
) {
  let emailAddress, linkExpirationString, validationRequired
  try {
    const url = new URL(link)
    const encryptedString = url.searchParams.get(magicLinkSearchParam) ?? '[]'
    const decryptedString = decrypt(encryptedString)
    const payload = JSON.parse(decryptedString) as MagicLinkPayload
    emailAddress = payload.emailAddress
    linkExpirationString = payload.expirationDate
    validationRequired = payload.validationRequired
  } catch (error: unknown) {
    console.error(error)
    throw new Error('Invalid magic link.')
  }

  if (typeof emailAddress !== 'string') {
    console.error(`Email is not a string. Maybe wasn't set in the session?`)
    throw new Error('Invalid magic link.')
  }

  if (typeof linkExpirationString !== 'string') {
    console.error('Link expiration is not a string.')
    throw new Error('Invalid magic link.')
  }

  if (validationRequired && emailAddress !== validationEmailAddress) {
    console.error(
      `The email for a magic link doesn't match the one in the session.`,
    )
    throw new Error('Invalid magic link.')
  }

  const linkExpirationDate = new Date(linkExpirationString)
  if (Date.now() > linkExpirationDate.getTime()) {
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

export {
  prisma,
  getMagicLink,
  validateMagicLink,
  createSession,
  getUserFromSessionId,
  getUserByEmail,
  updateUser,
  addPostRead,
}
