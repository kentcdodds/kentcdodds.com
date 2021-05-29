import {PrismaClient} from '@prisma/client'
import type {User, Call} from '@prisma/client'
import {encrypt, decrypt} from './encryption.server'

const prisma = new PrismaClient()

const linkExpirationTime = 1000 * 60 * 30
const sessionExpirationTime = 1000 * 60 * 60 * 24 * 30

let domainURL = `http://localhost:${process.env.PORT ?? '3000'}`
const isProd = process.env.NODE_ENV === 'production'
if (process.env.DOMAIN_URL) {
  domainURL = process.env.DOMAIN_URL
} else if (isProd) {
  throw new Error('Must set DOMAIN_URL')
}

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

function getMagicLink(email: string) {
  const expirationDate = new Date(Date.now() + linkExpirationTime).toISOString()
  const stringToEncrypt = JSON.stringify([email, expirationDate])
  const encryptedString = encrypt(stringToEncrypt)
  const url = new URL(domainURL)
  url.pathname = 'magic'
  url.searchParams.set(magicLinkSearchParam, encryptedString)
  return url.toString()
}

async function getSessionIdFromMagicLink(
  validationEmailAddress: string,
  link: string,
) {
  let email, linkExpirationString
  try {
    const url = new URL(link)
    const encryptedString = url.searchParams.get(magicLinkSearchParam) ?? '[]'
    const decryptedString = decrypt(encryptedString)
    ;[email, linkExpirationString] = JSON.parse(decryptedString)
  } catch {
    throw new Error('Invalid magic link.')
  }

  if (
    typeof email !== 'string' ||
    typeof linkExpirationString !== 'string' ||
    email !== validationEmailAddress
  ) {
    throw new Error('Invalid magic link.')
  }

  const linkExpirationDate = new Date(linkExpirationString)
  if (Date.now() > linkExpirationDate.getTime()) {
    throw new Error('Magic link expired. Please request a new one.')
  }

  const sessionExpirationDate = new Date(Date.now() + sessionExpirationTime)
  const user = (await getUserByEmail(email)) ?? (await createNewUser(email))
  const session = await prisma.session.create({
    data: {
      expirationDate: sessionExpirationDate,
      userId: user.id,
    },
  })
  return session.id
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
    throw new Error('Session expired. Please request a new magic link.')
  }

  return session.user
}

function deleteUserSession(sessionId: string) {
  return prisma.session.delete({where: {id: sessionId}})
}

function getUserByEmail(email: string) {
  return prisma.user.findUnique({where: {email}})
}

function createNewUser(email: string) {
  return prisma.user.create({data: {email}})
}

function updateUser(
  userId: string,
  updatedInfo: Omit<Partial<User>, 'id' | 'authId' | 'email'>,
) {
  return prisma.user.update({where: {id: userId}, data: updatedInfo})
}

function addCall(call: Omit<Call, 'id'>) {
  return prisma.call.create({data: call})
}

function getCallsByUser(userId: string) {
  return prisma.call.findMany({where: {userId}})
}

export {
  getMagicLink,
  getSessionIdFromMagicLink,
  getUserFromSessionId,
  deleteUserSession,
  getUserByEmail,
  createNewUser,
  updateUser,
  addCall,
  getCallsByUser,
}
