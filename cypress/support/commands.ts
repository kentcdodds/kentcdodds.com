import faker from 'faker'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * logs in with a random user. Yields the email and adds an alias to the email
       *
       * @returns {typeof login}
       * @memberof Chainable
       * @example
       *    cy.login().then(email => ...)
       */
      login: typeof login
    }
  }
}

function login(
  email: string = faker.internet.email(undefined, undefined, 'example.com'),
) {
  return cy
    .visit(`/__tests/login?email=${email}`)
    .then(() => email)
    .as('email')
}

Cypress.Commands.add('login', login)

/*
eslint
  @typescript-eslint/no-namespace: "off",
*/
