import '../app/entry.server'
import {test as base} from '@playwright/test'
import type {User} from '@prisma/client'
import {parse} from 'cookie'
import {PrismaClient} from '@prisma/client'
import {getSession} from '../app/utils/session.server'
import {createUser} from '../prisma/seed-utils'
import invariant from 'tiny-invariant'

type MSWData = {
  email: Record<string, Email>
}

type Email = {
  to: string
  from: string
  subject: string
  text: string
  html: string
}

export async function readEmail(
  recipientOrFilter: string | ((email: Email) => boolean),
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mswOutput = require('../mocks/msw.local.json') as MSWData
    const emails = Object.values(mswOutput.email).reverse() // reverse so we get the most recent email first
    // TODO: add validation
    if (typeof recipientOrFilter === 'string') {
      return emails.find(
        (email: Email) => email.to === recipientOrFilter,
      ) as Email | null
    } else {
      return emails.find(recipientOrFilter) as Email | null
    }
  } catch (error: unknown) {
    console.error(`Error reading the email fixture`, error)
    return null
  }
}

export function extractUrl(text: string) {
  const urlRegex = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
  const match = text.match(urlRegex)
  return match?.groups?.url
}

const users = new Set<User>()

export async function insertNewUser(userOverrides?: Partial<User>) {
  const prisma = new PrismaClient()

  const user = await prisma.user.create({
    data: {...createUser(), ...userOverrides},
  })
  await prisma.$disconnect()
  users.add(user)
  return user
}

export async function deleteUserByEmail(email: string) {
  const prisma = new PrismaClient()
  await prisma.user.delete({where: {email}})
  await prisma.$disconnect()
}

export const test = base.extend<{
  login: (userOverrides?: Partial<User>) => Promise<User>
}>({
  login: [
    async ({page, baseURL}, use) => {
      invariant(baseURL, 'baseURL is required playwright config')
      return use(async userOverrides => {
        const user = await insertNewUser(userOverrides)
        const session = await getSession(new Request(baseURL))
        await session.signIn(user)
        const cookieValue = await session.commit()
        invariant(
          cookieValue,
          'Something weird happened creating a session for a new user. No cookie value given from session.commit()',
        )
        const {KCD_root_session} = parse(cookieValue)
        invariant(KCD_root_session, 'No KCD_root_session cookie found')
        await page.context().addCookies([
          {
            name: 'KCD_root_session',
            sameSite: 'Lax',
            url: baseURL,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            value: KCD_root_session,
          },
        ])
        return user
      })
    },
    {auto: true},
  ],
})

export const {expect} = test

test.afterEach(async () => {
  const prisma = new PrismaClient()
  await prisma.user.deleteMany({
    where: {id: {in: [...users].map(u => u.id)}},
  })
  await prisma.$disconnect()
})
