module.exports = {
  '*.+(js|jsx|json|yml|yaml|css|less|scss|ts|tsx|md|graphql|gql|mdx|vue)': [
    // Lint only staged files; non-configured files are silently ignored.
    'eslint --no-warn-ignored',
    // Run tests related to the staged file set (fast, staged-only).
    'vitest related --run --passWithNoTests',
    // Run these once from repo root (lint-staged stashes unstaged changes).
    () => 'npm run typecheck --silent',
    () => 'npm run build --silent',
    // Build writes artifacts; clean so re-commits don't get polluted.
    () => 'npm run clean --silent',
  ],
}
