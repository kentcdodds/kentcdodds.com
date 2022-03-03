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
  cy.then(() => ({email, firstName, team})).as('user')
  cy.request('POST', '/__tests/login', {email, firstName, team, role})
  return cy.get('@user')
}

Cypress.Commands.add('login', login)

/*
eslint
  @typescript-eslint/no-namespace: "off",
*/
