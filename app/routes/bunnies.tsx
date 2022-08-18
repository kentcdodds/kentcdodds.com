// this route is just called bunnies because I don't want some "clever" blockers
// that just block "analytics" by default or whatever.
export async function loader() {
  return fetch('https://sailfish.kentcdodds.com/script.js')
}
