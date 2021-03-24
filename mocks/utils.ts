export const hitNetwork =
  process.env.MOCK_NETWORK === 'false'
    ? (req: {url: URL}) => {
        console.log(
          'Skipping mock and making a real request:',
          req.url.toString(),
        )
      }
    : null
