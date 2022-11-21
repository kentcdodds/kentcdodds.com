import {test, expect} from '@playwright/test'

test('App loads and nav works', async ({page}) => {
  await page.goto('/')

  const nav = page.getByRole('navigation')
  const blogLink = nav.getByRole('link', {name: 'Blog'})
  await blogLink.click()

  await expect(blogLink).toHaveClass(/underlined/)

  // Expects the URL to contain intro.
  await expect(page).toHaveURL(/.*blog/)
  await expect(
    page.getByRole('heading', {level: 1, name: 'Kent C. Dodds'}),
  ).toBeVisible()
})
