import faker from 'faker'

describe('contact', () => {
  it('should allow a typical user flow', () => {
    const firstName = faker.name.firstName()
    const emailData = {
      email: faker.internet.email(
        firstName,
        faker.name.lastName(),
        'example.com',
      ),
      firstName,
      subject: faker.lorem.words(3),
      body: faker.lorem.paragraphs(1).slice(0, 60),
    }
    const bodyPart1 = emailData.body.slice(0, 30)
    const bodyPart2 = emailData.body.slice(30)
    cy.login({email: emailData.email, firstName: emailData.firstName})
    cy.visit('/contact')
    cy.findByRole('textbox', {name: /name/i}).should(
      'have.value',
      emailData.firstName,
    )
    cy.findByRole('textbox', {name: /email/i}).should(
      'have.value',
      emailData.email,
    )
    cy.findByRole('textbox', {name: /subject/i}).type(emailData.subject)
    cy.findByRole('textbox', {name: /body/i}).type(bodyPart1)

    cy.findByRole('button', {name: /submit/i}).click()

    cy.findByRole('textbox', {name: /body/i}).then(textbox => {
      cy.get(`#${textbox.attr('aria-describedby') ?? 'no-described-by-found'}`)
        .then(el => el.text())
        .should('match', /too short/i)
    })

    cy.findByRole('textbox', {name: /body/i}).type(bodyPart2)

    cy.findByRole('button', {name: /submit/i}).click()
    cy.fixture('msw.local.json').then((data: {email: {html: string}}) => {
      expect(data.email).to.include({
        from: `"${emailData.firstName}" <${emailData.email}>`,
        subject: emailData.subject,
        text: emailData.body,
      })
      expect(data.email.html).to.match(/<html/)
      expect(data.email.html).to.have.length.greaterThan(emailData.body.length)
    })
  })
})
