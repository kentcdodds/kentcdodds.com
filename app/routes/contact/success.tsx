import * as React from 'react'
import {ButtonGroup} from '../../components/form-elements'
import {Button, ButtonLink} from '../../components/button'

export default function Screen() {
  return (
    <ButtonGroup>
      <Button type="submit" disabled>
        Hooray, email sent!&nbsp;
        <span role="img" aria-label="party popper emoji">
          🎉
        </span>
      </Button>
      <ButtonLink
        to="/contact"
        variant="secondary"
        onClick={e => e.currentTarget.closest('form')?.reset()}
      >
        Reset form
      </ButtonLink>
    </ButtonGroup>
  )
}
