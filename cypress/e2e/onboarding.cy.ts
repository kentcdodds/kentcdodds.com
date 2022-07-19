import {faker} from '@faker-js/faker'

describe('onboarding', () => {
  it('should allow a user to register a new account', () => {
    const firstName = faker.name.firstName()
    const email = faker.internet.email(
      firstName,
      faker.name.lastName(),
      'example.com',
    )
    cy.visit('/')

    cy.findByRole('navigation').within(() => {
      cy.findByRole('link', {name: /login/i}).click()
    })

    cy.findByRole('main').within(() => {
      cy.findByRole('textbox', {name: /email/i}).type(`${email}{enter}`)
      cy.wait(200)
      cy.readFile('mocks/msw.local.json').then(
        (data: {email: {text: string}}) => {
          const magicLink = data.email.text.match(/(http.+magic.+)\n/)?.[1]
          if (magicLink) {
            return cy.visit(magicLink)
          }
          throw new Error('Could not find magic link email')
        },
      )
    })

    cy.findByRole('main').within(() => {
      cy.findByRole('textbox', {name: /name/i}).type(firstName)
      cy.findByRole('group', {name: /team/i}).within(() => {
        // checkbox is covered with a <label>
        cy.findByRole('radio', {name: /blue/i}).click({force: true})
      })
      cy.findByRole('button', {name: /create account/i}).click()
    })
  })
})
