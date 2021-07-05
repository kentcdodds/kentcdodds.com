describe('discord', () => {
  it('should allow a user to connect their discord account', () => {
    cy.login()

    cy.visit('/me')

    cy.findByRole('main').within(() => {
      cy.findByRole('link', {name: /connect/i}).then(link => {
        const href = link.attr('href') as string
        const redirectURI = new URL(href).searchParams.get('redirect_uri')
        if (!redirectURI) {
          throw new Error(
            'The connect link does not have a redirect_uri parameter.',
          )
        }

        const nextLocation = new URL(redirectURI)
        nextLocation.searchParams.set('code', 'test_discord_auth_code')
        cy.visit(nextLocation.toString())
      })
    })

    cy.findByRole('main').within(() => {
      // eventually this should probably be improved but it's ok for now.
      // using hard coded IDs like this is not awesome.
      cy.findByDisplayValue(/test_discord_username/i)
    })
  })
})
