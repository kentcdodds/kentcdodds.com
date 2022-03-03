import {faker} from '@faker-js/faker'

describe('call in', () => {
  it('should allow creating a call, response, and podcast', () => {
    const title = faker.lorem.words(2)

    cy.login()
    cy.visit('/calls')
    cy.findAllByRole('link', {name: /record/i})
      .first()
      .click()
    cy.findByRole('link', {name: /new recording/i}).click()
    cy.findByRole('main').within(() => {
      cy.findByRole('button', {name: /current.*device/i}).click()
      // this is hidden by the label, but it's definitely clickable
      cy.findByRole('checkbox', {name: /default/i}).click({force: true})
      cy.findByRole('button', {name: /start/i}).click()
      cy.wait(50)
      cy.findByRole('button', {name: /pause/i}).click()
      cy.findByRole('button', {name: /resume/i}).click()
      cy.wait(50)
      cy.findByRole('button', {name: /stop/i}).click()
      cy.findByRole('button', {name: /re-record/i}).click()

      cy.findByRole('button', {name: /start/i}).click()
      cy.wait(500)
      cy.findByRole('button', {name: /stop/i}).click()

      cy.findByRole('button', {name: /accept/i}).click()
      cy.findByRole('textbox', {name: /title/i}).type(title)
      cy.findByRole('textbox', {name: /description/i}).type(
        faker.lorem.paragraph(),
        {delay: 0},
      )
      cy.findByRole('textbox', {name: /keywords/i}).type(
        faker.lorem.words(3).split(' ').join(','),
        {delay: 0},
      )
      cy.findByRole('button', {name: /submit/i}).click()
    })

    // login as admin
    cy.login({role: 'ADMIN'})
    cy.visit('/calls/admin')
    cy.findByRole('main').within(() => {
      cy.findByRole('link', {name: new RegExp(title, 'i')}).click()

      cy.findByRole('button', {name: /start/i}).click()
      cy.wait(500)
      cy.findByRole('button', {name: /stop/i}).click()

      cy.findByRole('button', {name: /accept/i}).click()
      // processing the audio takes a while, so let the timeout run
      cy.findByRole('button', {name: /submit/i}).click({timeout: 10000})
    })
  })
})
