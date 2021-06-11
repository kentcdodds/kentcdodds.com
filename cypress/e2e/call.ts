import faker from 'faker'

describe('call in', () => {
  it('should allow a typical user flow', () => {
    cy.login()
    cy.visit('/')
    cy.findByRole('link', {name: /call kent/i}).click()
    cy.findByRole('heading', {name: /Call Kent Podcast/i})
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
    cy.findByRole('textbox', {name: /title/i}).type(faker.lorem.words(2))
    cy.findByRole('textbox', {name: /description/i}).type(
      faker.lorem.paragraph(),
      {delay: 0},
    )
    cy.findByRole('button', {name: /submit/i}).click()
  })
})
