function getEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  }
}

type ENV = ReturnType<typeof getEnv>

// App puts these on
declare global {
  // TODO: This doesn't appear to add type safety to global.ENV 🤷‍♂️
  const ENV: ENV
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
