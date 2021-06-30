import * as React from 'react'

function LoadMoreButton() {
  return (
    <button className="dark:focus:bg-gray-800 flex items-center px-8 py-6 dark:text-white focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none">
      {/* TODO: an svg plus often looks better. */}
      Load more articles +
    </button>
  )
}
export {LoadMoreButton}
