module.exports = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  const isDev = config.watchForFileChanges
  const port = process.env.PORT ?? (isDev ? '3000' : '8811')
  const configOverrides: Partial<Cypress.PluginConfigOptions> = {
    baseUrl: `http://localhost:${port}`,
    viewportWidth: 1030,
    viewportHeight: 800,
    integrationFolder: 'cypress/e2e',
    video: !process.env.CI,
    screenshotOnRunFailure: !process.env.CI,
  }
  Object.assign(config, configOverrides)

  on('before:browser:launch', (browser, options) => {
    if (browser.name === 'chrome') {
      options.args.push(
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-audio-capture=cypress/fixtures/sample.wav',
      )
    }
    return options
  })

  on('task', {
    log(message) {
      console.log(message)
      return null
    },
  })

  return config
}
