describe('smoke', () => {
  it('should allow a typical user flow', () => {
    cy.visit('/')

    cy.findByRole('heading', {name: /elaborate/i})
  })
})
