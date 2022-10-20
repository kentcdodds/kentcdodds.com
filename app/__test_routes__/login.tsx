import type {ActionFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {getMagicLink, prismaWrite, prismaRead} from '~/utils/prisma.server'
import {getDomainUrl} from '~/utils/misc'

export const action: ActionFunction = async ({request}) => {
  const form = await request.json()
  const email = form.email
  const firstName = form.firstName
  const team = form.team
  const role = form.role ?? 'MEMBER'
  if (typeof email !== 'string') {
    throw new Error('email required for login page')
  }
  if (!email.endsWith('example.com')) {
    throw new Error('All test emails must end in example.com')
  }

  const user = await prismaRead.user.findUnique({where: {email}})
  if (user) {
    if (typeof firstName === 'string') {
      await prismaWrite.user.update({where: {id: user.id}, data: {firstName}})
    }
  } else {
    if (typeof firstName !== 'string') {
      throw new Error('firstName required when creating a new user')
    }
    if (team !== 'BLUE' && team !== 'YELLOW' && team !== 'RED') {
      throw new Error('a valid team is required')
    }

    await prismaWrite.user.create({data: {email, team, firstName, role}})
  }
  return redirect(
    getMagicLink({
      emailAddress: email,
      validateSessionMagicLink: false,
      domainUrl: getDomainUrl(request),
    }),
  )
}

export default () => null
