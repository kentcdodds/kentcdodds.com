const process = require('process')
const {
  NODE_ENV = 'development',
  HONEYCOMB_API_KEY,
  HONEYCOMB_DATASET,
  FLY,
  FLY_REGION,
  DISABLE_TELEMETRY,
} = process.env

function go() {
  const {Metadata, credentials} = require('@grpc/grpc-js')

  const {NodeSDK} = require('@opentelemetry/sdk-node')
  const {
    getNodeAutoInstrumentations,
  } = require('@opentelemetry/auto-instrumentations-node')
  const {Resource} = require('@opentelemetry/resources')
  const {
    SemanticResourceAttributes,
  } = require('@opentelemetry/semantic-conventions')
  const {
    CollectorTraceExporter,
  } = require('@opentelemetry/exporter-collector-grpc')

  const metadata = new Metadata()
  let dataset = `${HONEYCOMB_DATASET}-${NODE_ENV}`
  if (!FLY) {
    const {username} = require('os').userInfo()
    dataset = `local-${username}-${dataset}`
  }

  metadata.set('x-honeycomb-team', HONEYCOMB_API_KEY)
  metadata.set('x-honeycomb-dataset', dataset)
  metadata.set('x-fly-region', FLY_REGION)

  const traceExporter = new CollectorTraceExporter({
    url: 'grpc://api.honeycomb.io:443/',
    credentials: credentials.createSsl(),
    metadata,
  })

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'remix',
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  })

  sdk
    .start()
    .then(() => console.log('Tracing initialized'))
    .catch(error => console.log('Error initializing tracing', error))

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch(error => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0))
  })
}

if (!DISABLE_TELEMETRY) {
  go()
}
