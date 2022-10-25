import {test, expect, readEmail} from './utils'
import {faker} from '@faker-js/faker'
import invariant from 'tiny-invariant'

test('Users can send an email', async ({page, login}) => {
  const user = await login()
  await page.goto('/')

  await page
    .getByRole('contentinfo')
    .getByRole('link', {name: 'Email Kent'})
    .click()

  await expect(page).toHaveURL(/.*contact/)
  await expect(
    page.getByRole('heading', {level: 2, name: /send me an email/i}),
  ).toBeVisible()

  // verify name and email are prefilled
  const mainContent = page.getByRole('main')
  await expect(mainContent.getByRole('textbox', {name: /name/i})).toHaveValue(
    user.firstName,
  )
  await expect(mainContent.getByRole('textbox', {name: /email/i})).toHaveValue(
    user.email,
  )

  const subject = faker.lorem.sentence()
  // fill in subject/body
  await mainContent.getByRole('textbox', {name: /subject/i}).fill(subject)
  const bodyLorem = faker.lorem.paragraphs(1)
  const body = `
This **supports markdown**

${bodyLorem}
  `.trim()
  await mainContent.getByRole('textbox', {name: /body/i}).fill(body)
  await mainContent.getByRole('button', {name: /send/i}).click()
  await expect(page.getByText(/email sent/i)).toBeVisible()
  const email = await readEmail(em => em.to.includes('me@kentcdodds.com'))
  invariant(email, 'Email not found')
  expect(email.from).toMatch(user.email)
  expect(email.subject).toMatch(subject)
  expect(email.text).toMatch(bodyLorem)
  expect(email.text).toMatch('- Sent via the KCD Contact Form')
  expect(email.html).toMatch(`<strong>supports markdown</strong>`)
})
