import * as React from 'react'
import {ArrowIcon} from '@kcd/components/icons/arrow-icon'
import {SunIcon} from '@kcd/components/icons/sun-icon'
import {MoonIcon} from '@kcd/components/icons/moon-icon'
import {MenuIcon} from '@kcd/components/icons/menu-icon'

export default {
  title: 'Icons',
  component: ArrowIcon,
}

// TODO: dark/light mode is broken here, as tailwind doesn't extract classnames
//   out of stories. Which is fine.., I think.
export const AllIcons = () => (
  <div
    className="flex gap-4 dark:text-black text-white"
    style={{color: 'white '}}
  >
    <ArrowIcon direction="up" />
    <ArrowIcon direction="right" />
    <ArrowIcon direction="down" />
    <ArrowIcon direction="left" />
    <SunIcon />
    <MoonIcon />
    <MenuIcon />
  </div>
)
