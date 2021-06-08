import type {Role} from '@prisma/client'
import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import {rootStorage} from '../utils/session.server'
import {
  getMagicLink,
  updateUser,
  createNewUser,
  getUserByEmail,
} from '../utils/prisma.server'

export const loader: LoaderFunction = async ({request}) => {
  const query = new URL(request.url)
  const email = query.searchParams.get('email')
  const firstName = query.searchParams.get('firstName')
  const team = query.searchParams.get('team')
  const role = (query.searchParams.get('role') ?? 'MEMBER') as Role
  if (!email) {
    throw new Error('email required for login page')
  }
  if (!email.endsWith('example.com')) {
    throw new Error('All test emails must end in example.com')
  }

  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  session.set('email', email)

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

    await createNewUser({email, team, firstName, role})
  }
  return redirect(getMagicLink(email), {
    headers: {'Set-Cookie': await rootStorage.commitSession(session)},
  })
}

export default () => null
