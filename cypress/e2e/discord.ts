describe('onboarding', () => {
  it('should allow a user to register a new account', () => {
    cy.login()

    cy.visit('/me')
    cy.findByRole('link', {name: /connect/i}).then(link => {
      const redirectURI = new URL(link.attr('href') as string).searchParams.get(
        'redirect_uri',
      )
      if (!redirectURI) {
        throw new Error(
          'The connect link does not have a redirect_uri parameter.',
        )
      }
      const nextLocation = new URL(redirectURI)
      nextLocation.searchParams.set('code', 'test_discord_auth_code')
      cy.visit(nextLocation.toString())
    })

    // eventually this should probably be improved but it's ok for now.
    // using hard coded IDs like this is not awesome.
    cy.findByText(/test_discord_id/i)
  })
})
