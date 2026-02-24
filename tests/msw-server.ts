import { setupServer } from 'msw/node'
import { mswHandlers } from '#mocks/msw-handlers.ts'

export const mswServer = setupServer(...mswHandlers)

