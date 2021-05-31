describe('login', () => {
  it('should allow a user to login', () => {
    cy.visit('/')
    cy.findByRole('link', {name: /login/i}).click()
    cy.findByRole('textbox', {name: /email/i}).type('test@example.com{enter}')
    cy.fixture('msw.local.json').then((data: {email: {text: string}}) => {
      const magicLink = data.email.text.match(/(http.+magic.+)\n/)?.[1]
      if (magicLink) {
        return cy.visit(magicLink)
      }
      throw new Error('Could not find magic link email')
    })

    cy.findByRole('button', {name: /logout/i}).click()
    cy.findByRole('link', {name: /login/i})
  })
})
