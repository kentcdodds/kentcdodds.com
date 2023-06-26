module.exports = {
  '*.+(js|jsx|json|yml|yaml|css|less|scss|ts|tsx|md|graphql|mdx|vue)': [
    `kcd-scripts format`,
    `kcd-scripts lint`,
    `kcd-scripts test --findRelatedTests`,
  ],
}
