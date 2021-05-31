describe('contact', () => {
  it('should allow a typical user flow', () => {
    cy.login()
    cy.visit('/contact')
    cy.findByRole('textbox', {name: /name/i}).type('Kody')
    cy.get<string>('@email').then((email: string) => {
      cy.findByRole('textbox', {name: /email/i}).should('have.value', email)
    })
    cy.findByRole('textbox', {name: /subject/i}).type('This is a test subject')
    cy.findByRole('textbox', {name: /body/i}).type(
      'Check out this awesome email! I need to make it pretty long though.',
    )
    cy.findByRole('button', {name: /submit/i}).click()
  })
})
