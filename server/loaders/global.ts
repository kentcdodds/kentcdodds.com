import type {DataLoader} from '@remix-run/core'

const loader: DataLoader = () => {
  return {
    date: new Date(),
  }
}

// https://github.com/remix-run/discuss/issues/14
module.exports = loader
