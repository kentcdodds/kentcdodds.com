let failedLastTime = true
function getCourseInfo() {
  // pretend this makes an HTTP request 😅
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failedLastTime) {
        failedLastTime = false
        resolve({
          title: 'Advanced React Hooks',
          subtitle:
            'To learn the more advanced React hooks and different patterns to enable great developer APIs for custom hooks.',
          topics: [
            `Use useReducer to manage state and avoid stale state bugs (and learn when it's preferable over useState)`,
            `Optimize expensive operations with useMemo and useCallback`,
            `Interact with third party DOM libraries with useLayoutEffect`,
            `Learn when to use (and when not to use) useImperativeHandle and useDebugValue`,
            `Create custom hooks for complex use cases`,
          ],
        })
      } else {
        failedLastTime = true
        reject({message: 'Something went wrong'})
      }
    }, 1000)
  })
}

export {getCourseInfo}
