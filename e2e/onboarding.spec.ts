import {test, expect} from '@playwright/test'
import {faker} from '@faker-js/faker'
import invariant from 'tiny-invariant'
import {deleteUserByEmail, extractUrl, readEmail} from './utils'

test('A new user can create an account', async ({page}) => {
  const firstName = faker.name.firstName()
  const emailAddress = faker.internet.email(
    firstName,
    faker.name.lastName(),
    'example.com',
  )
  await page.goto('/')
  await page.getByRole('navigation').getByRole('link', {name: 'Login'}).click()
  await expect(page).toHaveURL(/.*login/)
  await expect(
    page.getByRole('heading', {level: 2, name: /Log.?in/i}),
  ).toBeVisible()

  // submit email to sign up
  await page
    .getByRole('banner')
    .getByRole('textbox', {name: /email/i})
    .fill(emailAddress)
  await page
    .getByRole('banner')
    .getByRole('textbox', {name: /email/i})
    .press('Enter')
  await expect(page.getByText(/magic link has been sent/i)).toBeVisible()

  // read and verify the email
  const email = await readEmail(emailAddress)
  invariant(email, 'Email not found')
  expect(email.to).toBe(emailAddress)
  expect(email.from).toMatch(/team\+kcd@kentcdodds.com/)
  expect(email.subject).toMatch(/magic/i)
  const magicLink = extractUrl(email.text)
  invariant(magicLink, 'Magic Link not found')
  await page.goto(magicLink)

  // sign up for an account
  const mainContent = page.getByRole('main')
  await expect(page).toHaveURL(/.*signup/)
  await mainContent.getByRole('textbox', {name: /name/i}).fill(firstName)
  await mainContent.getByRole('radio', {name: /blue/i}).check({force: true})
  await mainContent.getByRole('button', {name: /create account/i}).click()

  await expect(page).toHaveURL(/.*me/)
  await expect(
    page.getByRole('heading', {level: 2, name: /profile/i}),
  ).toBeVisible()

  await deleteUserByEmail(emailAddress)

  await page.reload()
  await expect(page).toHaveURL(/.*login/)
})
