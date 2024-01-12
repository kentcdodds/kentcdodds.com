import {execa} from 'execa'

if (process.env.NODE_ENV === 'production') {
  await import('../index.js')
} else {
  const command = 'tsx --inspect ./index.js'
  execa(command, {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    env: {
      FORCE_COLOR: true,
      MOCKS: true,
      ...process.env,
    },
    // https://github.com/sindresorhus/execa/issues/433
    windowsHide: false,
  })
}
