import faker from 'faker'
import type {User} from '../../types'

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
  team = 'UNDECIDED',
}: Partial<Omit<User, 'id'>> = {}) {
  const query = new URLSearchParams()
  query.set('email', email)
  if (firstName) query.set('firstName', firstName)
  if (team) query.set('team', team)
  cy.then(() => ({email, firstName, team})).as('user')
  return cy.visit(`/__tests/login?${query.toString()}`)
}

Cypress.Commands.add('login', login)

/*
eslint
  @typescript-eslint/no-namespace: "off",
*/
