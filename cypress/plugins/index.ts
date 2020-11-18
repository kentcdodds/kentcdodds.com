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

  return config
}
