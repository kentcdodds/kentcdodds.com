describe('login', () => {
  it('should allow a user to login', () => {
    cy.visit('/')
    cy.findByRole('link', {name: /login/i}).click()
    cy.findByRole('textbox', {name: /email/i}).type('test@example.com{enter}')
    cy.fixture('msw').then((data: {magicLink: string}) => {
      cy.visit(data.magicLink)
    })
    cy.findByRole('button', {name: /logout/i}).click()
    cy.findByRole('link', {name: /login/i})
  })
})
