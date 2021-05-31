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
  if (!email) {
    throw new Error('email required for login page')
  }
  if (!email.endsWith('example.com')) {
    throw new Error('All test emails must end in example.com')
  }
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  session.set('email', email)
  const user = (await getUserByEmail(email)) ?? (await createNewUser(email))
  if (firstName) {
    await updateUser(user.id, {firstName})
  }
  if (
    team === 'UNDECIDED' ||
    team === 'BLUE' ||
    team === 'YELLOW' ||
    team === 'RED'
  ) {
    await updateUser(user.id, {team})
  }
  return redirect(getMagicLink(email), {
    headers: {'Set-Cookie': await rootStorage.commitSession(session)},
  })
}

export default () => null
