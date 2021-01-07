import type {Loader, Action} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'

const action: Action = ({session}) => {
  session.set('success', 'true')
  return redirect('/contact')
}

const loader: Loader = ({session}) => {
  return json({success: session.get('success') === 'true'})
}

export {action, loader}
