import * as React from 'react'
import {Link} from 'react-router-dom'

function Header() {
  return (
    <div>
      <header className="max-w-md m-auto text-center">
        <h1 className="text-6xl">Elaborate</h1>
        <div>
          <blockquote>
            {`If you don't want to forget what you learned, write it down.`}
          </blockquote>
          <div className="text-right">- Kent</div>
        </div>
      </header>
      <nav className="p-8 text-lg">
        <ul className="flex justify-between max-w-md m-auto">
          <li>
            <Link to="/posts" className="underline">
              Posts
            </Link>
          </li>
          <li>
            <a href="/posts/random" className="underline">
              Random Post
            </a>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export {Header}
