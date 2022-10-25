import {test, expect, readEmail} from './utils'
import {faker} from '@faker-js/faker'
import invariant from 'tiny-invariant'

test('Call Kent recording flow', async ({page, login}) => {
  const user = await login()
  await page.goto('/calls')

  const title = faker.lorem.words(2)
  await page
    .getByRole('banner')
    .getByRole('link', {name: /record/i})
    .click()
  await expect(page).toHaveURL(/.*record/)
  await expect(
    page.getByRole('heading', {level: 2, name: /record your call/i}),
  ).toBeVisible()

  const mainContent = page.getByRole('main')
  await mainContent.getByRole('link', {name: /new recording/i}).click()
  await mainContent.getByRole('button', {name: /current.*device/i}).click()

  await mainContent
    .getByRole('checkbox', {name: /default/i})
    .click({force: true})
  await mainContent.getByRole('button', {name: /start/i}).click()
  await page.waitForTimeout(50) // let the sample.wav file play for a bit
  await mainContent.getByRole('button', {name: /pause/i}).click()
  await mainContent.getByRole('button', {name: /resume/i}).click()
  await page.waitForTimeout(50) // let the sample.wav file play for a bit more
  await mainContent.getByRole('button', {name: /stop/i}).click()
  await mainContent.getByRole('button', {name: /re-record/i}).click()

  await mainContent.getByRole('button', {name: /start/i}).click()
  await page.waitForTimeout(500) // let the sample.wav file play for a bit more
  await mainContent.getByRole('button', {name: /stop/i}).click()

  await mainContent.getByRole('button', {name: /accept/i}).click()
  await mainContent.getByRole('textbox', {name: /title/i}).type(title)
  await mainContent
    .getByRole('textbox', {name: /description/i})
    .type(faker.lorem.paragraph())
  await mainContent
    .getByRole('textbox', {name: /keywords/i})
    .type(faker.lorem.words(3).split(' ').join(','))
  await mainContent.getByRole('button', {name: /submit/i}).click()

  await login({role: 'ADMIN'})
  await page.goto('/calls/admin')

  await page.getByRole('link', {name: new RegExp(title, 'i')}).click()

  await page.getByRole('button', {name: /start/i}).click()
  await page.waitForTimeout(500) // let the sample.wav file play for a bit more
  await page.getByRole('button', {name: /stop/i}).click()

  await page.getByRole('button', {name: /accept/i}).click()
  await page.getByRole('button', {name: /submit/i}).click()
  await expect(page).toHaveURL(/.*calls$/)

  // processing the audio takes a while, so let the timeout run
  await expect(
    page
      .getByRole('banner')
      .getByRole('heading', {level: 2, name: /calls with kent/i}),
  ).toBeVisible({timeout: 10_000})

  const email = await readEmail(em => em.to.includes(user.email))
  invariant(email, 'Notification email not found')
  expect(email.subject).toMatch(/published/i)
  // NOTE: domain is hard coded for image generation and stuff
  expect(email.text).toContain('https://kentcdodds.com/calls')
})
