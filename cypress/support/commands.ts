import faker from 'faker'
import type {Team, Role} from '../../types'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * logs in with a random user. Yields the email and adds an alias to the email
       *
       * @returns {typeof login}
       * @memberof Chainable
       * @example
       *    cy.login().then(user => ...)
       */
      login: typeof login
    }
  }
}

function login({
  firstName = faker.name.firstName(),
  email = faker.internet.email(
    firstName ?? undefined,
    undefined,
    'example.com',
  ),
  team = 'BLUE',
  role = 'MEMBER',
}: {
  firstName?: string | null
  email?: string
  team?: Team | null
  role?: Role | null
} = {}) {
  const query = new URLSearchParams()
  query.set('email', email)
  if (firstName) query.set('firstName', firstName)
  if (team) query.set('team', team)
  if (role) query.set('role', role)
  cy.then(() => ({email, firstName, team})).as('user')
  return cy.visit(`/__tests/login?${query.toString()}`)
}

Cypress.Commands.add('login', login)

/*
eslint
  @typescript-eslint/no-namespace: "off",
*/
