import '../../app/global.css'

const classes = `text-green-900 bg-gray-100 dark:bg-gray-800 dark:text-green-300`.split(
  ' ',
)
for (const c of classes) {
  document.body.classList.add(c)
}

export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
}
