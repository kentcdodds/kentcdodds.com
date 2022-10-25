import {test, expect} from './utils'
import invariant from 'tiny-invariant'

test('A new user can create an account', async ({page, login}) => {
  await login()
  await page.goto('/me')

  const mainContent = page.getByRole('main')
  const discordConnectHref = await mainContent
    .getByRole('link', {name: /connect/i})
    .getAttribute('href')
  invariant(discordConnectHref, 'Discord connect link not found')
  const redirectURI = new URL(discordConnectHref).searchParams.get(
    'redirect_uri',
  )
  invariant(redirectURI, 'No redirect_uri found in discord connect link')

  const nextLocation = new URL(redirectURI)
  nextLocation.searchParams.set('code', 'test_discord_auth_code')
  await page.goto(nextLocation.toString())

  await expect(page.getByRole('link', {name: /connected/i})).toHaveAttribute(
    'href',
    'https://discord.com/users/test_discord_id',
  )
  await expect(page.getByRole('textbox', {name: /discord/i})).toHaveValue(
    'test_discord_username',
  )
})
