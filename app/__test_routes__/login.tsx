import type {Role} from '@prisma/client'
import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import {
  getMagicLink,
  updateUser,
  getUserByEmail,
  prisma,
} from '~/utils/prisma.server'
import {getDomainUrl} from '~/utils/misc'

export const loader: LoaderFunction = async ({request}) => {
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const firstName = url.searchParams.get('firstName')
  const team = url.searchParams.get('team')
  const role = (url.searchParams.get('role') ?? 'MEMBER') as Role
  if (!email) {
    throw new Error('email required for login page')
  }
  if (!email.endsWith('example.com')) {
    throw new Error('All test emails must end in example.com')
  }

  const user = await getUserByEmail(email)
  if (user) {
    if (firstName) {
      await updateUser(user.id, {firstName})
    }
  } else {
    if (!firstName) {
      throw new Error('firstName required when creating a new user')
    }
    if (team !== 'BLUE' && team !== 'YELLOW' && team !== 'RED') {
      throw new Error('a valid team is required')
    }

    await prisma.user.create({data: {email, team, firstName, role}})
  }
  return redirect(
    getMagicLink({emailAddress: email, domainUrl: getDomainUrl(request)}),
  )
}

export default () => null
