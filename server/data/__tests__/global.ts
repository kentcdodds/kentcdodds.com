// eslint-disable-next-line
const globalLoader = require('../global')

test('sends back the right data', async () => {
  expect(await globalLoader()).toEqual({
    date: expect.any(Date),
  })
})
