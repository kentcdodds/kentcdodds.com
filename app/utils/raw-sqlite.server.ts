import Database from 'better-sqlite3'
import {getRequiredServerEnvVar} from './misc'

const FLY_LITEFS_DIR = getRequiredServerEnvVar('FLY_LITEFS_DIR')

declare global {
  var __rawDb: ReturnType<typeof Database> | undefined
}

export const rawDb = (global.__rawDb = global.__rawDb
  ? global.__rawDb
  : new Database(`${FLY_LITEFS_DIR}/sqlite.db`))

/*
eslint
  no-var: "off",
  vars-on-top: "off",
  no-multi-assign: "off",
*/
