const getEnv = () => ({
  NODE_ENV: process.env.NODE_ENV,
  DOMAIN_URL: process.env.DOMAIN_URL,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
})

type ENV = ReturnType<typeof getEnv>

// App puts these on
declare global {
  const ENV: ENV
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      ENV: ENV
    }
  }
  interface Window {
    ENV: ENV
  }
}

export {getEnv}
