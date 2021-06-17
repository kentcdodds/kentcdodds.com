import faker from 'faker'

describe('call in', () => {
  it('should allow creating a call, response, and podcast', () => {
    const title = faker.lorem.words(2)

    cy.login()
    cy.visit('/call')
    cy.findByRole('link', {name: /record/i}).click()
    cy.findByRole('button', {name: /change.*device/i}).click()
    cy.findByRole('button', {name: /default/i}).click()
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
    cy.findByRole('button', {name: /submit/i}).click()

    // login as admin
    cy.login({role: 'ADMIN'})
    cy.visit('/call/list')
    cy.findByRole('link', {name: title}).click()

    cy.findByRole('button', {name: /start/i}).click()
    cy.wait(500)
    cy.findByRole('button', {name: /stop/i}).click()

    cy.findByRole('button', {name: /accept/i}).click()
    cy.findByRole('button', {name: /submit/i}).click()
  })
})
