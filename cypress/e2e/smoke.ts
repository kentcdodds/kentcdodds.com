describe('smoke', () => {
  it('should allow a typical user flow', () => {
    cy.visit('/blog')

    cy.findByRole('heading', {name: /Kent C. Dodds/i})
  })
})
