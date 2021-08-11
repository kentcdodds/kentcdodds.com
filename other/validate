#!/bin/sh

npx concurrently \
  --kill-others-on-fail \
  --prefix "[{name}]" \
  --names "test,lint,typecheck,build" \
  --prefix-colors "bgRed.bold.white,bgGreen.bold.white,bgBlue.bold.white,bgMagenta.bold.white" \
    "npm run test --silent -- --watch=false" \
    "npm run lint --silent" \
    "npm run typecheck --silent" \
    "npm run build --silent"
