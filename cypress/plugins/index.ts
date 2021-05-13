module.exports = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  const isDev = config.watchForFileChanges
  const port = process.env.PORT ?? (isDev ? '3000' : '8811')
  config.baseUrl = `http://localhost:${port}`
  Object.assign(config, {
    integrationFolder: 'cypress/e2e',
  })

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

  return config
}
