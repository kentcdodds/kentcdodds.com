function getCurrentStoryComponent(params) {
  // 1️⃣ get story ID and name from URL
  let storyInfo = new URLSearchParams(window.location.search)
    .get('id')
    .split('--')
  if (window.parent !== window) {
    // if we're in an iframe, then the window.location.search may not
    // be updated yet (no idea why), so we'll determine the id and export name
    // via the parent's URL. Super weird and annoying, but whatever.
    storyInfo = new URLSearchParams(window.parent.location.search)
      .get('path')
      .slice('/story/'.length)
      .split('--')
  }
  const [id, exportName] = storyInfo

  // 2️⃣ get story module
  const mod = require(`../../stories/${id}.stories`)

  // map module exports to the exportName (which is lower-case and kebab-spaced)
  const lowerExports = {}
  for (const [key, value] of Object.entries(mod)) {
    lowerExports[key.toLowerCase()] = value
  }
  const normalizedExportName = exportName.replace(/-/g, '')

  // 3️⃣ get the component that's being rendered
  const comp = lowerExports[normalizedExportName]
  if (!comp) {
    const info = JSON.stringify(
      {
        exportName,
        normalizedExportName,
        exports: Object.keys(mod),
        lowerExports: Object.keys(lowerExports),
      },
      null,
      2,
    )
    throw new Error(
      `Unable to determine the story component from the URL. Here's some info:\n\n${info}`,
    )
  }

  return comp
}

function useRouteData() {
  const comp = getCurrentStoryComponent()
  if (!comp.routeData) {
    throw new Error(
      `Tried to get route data for a story that uses useRouteData but does not expose routeData: ${comp.name}`,
    )
  }
  return comp.routeData
}

function useGlobalData() {
  const comp = getCurrentStoryComponent()
  if (!comp.globalData) {
    throw new Error(
      `Tried to get route data for a story that uses useGlobalData but does not expose globalData: ${comp.name}`,
    )
  }
  return comp.globalData
}

function useLocationPending() {
  const comp = getCurrentStoryComponent()
  if (!comp.locationPending) {
    throw new Error(
      `Tried to get route data for a story that uses useLocationPending but does not expose locationPending: ${comp.name}`,
    )
  }
  return comp.locationPending
}

export {useGlobalData, useRouteData}
