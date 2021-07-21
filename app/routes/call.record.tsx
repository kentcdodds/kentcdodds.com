import * as React from 'react'
import {Link, Outlet} from 'react-router-dom'
import {json, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import type {Await} from 'types'
import {AnimatePresence, motion} from 'framer-motion'
import {useLocation} from 'react-router'
import {getUser} from '../utils/session.server'
import {prisma} from '../utils/prisma.server'
import {callKentStorage} from '../utils/call-kent.server'
import {useOptionalUser} from '../utils/providers'
import {Grid} from '../components/grid'
import {H2, Paragraph} from '../components/typography'
import {BackLink} from '../components/arrow-button'

function getCalls(userId: string) {
  return prisma.call.findMany({
    where: {userId},
    select: {id: true, title: true},
  })
}

type LoaderData = {
  calls: Await<ReturnType<typeof getCalls>>
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await callKentStorage.getSession(
    request.headers.get('Cookie'),
  )
  const data: LoaderData = {
    calls: user ? await getCalls(user.id) : [],
  }
  return json(data, {
    headers: {
      'Set-Cookie': await callKentStorage.commitSession(session),
    },
  })
}

function MaybeOutlet({open}: {open: boolean}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          variants={{
            collapsed: {
              height: 0,
              marginTop: 0,
              marginBottom: 0,
              opacity: 0,
            },
            expanded: {
              height: 'auto',
              marginTop: '1rem',
              marginBottom: '3rem',
              opacity: 1,
            },
          }}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
          transition={{duration: 0.15}}
          className="relative col-span-full"
        >
          <Outlet />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Record({
  active,
  title,
  slug,
}: {
  slug: string
  active: boolean
  title: string
}) {
  return (
    <Grid nested className="border-b border-gray-200 dark:border-gray-600">
      <Link
        to={active ? './' : slug}
        className="text-primary group relative relative flex flex-col col-span-full py-5 text-xl font-medium"
      >
        <div className="bg-secondary absolute -inset-px group-hover:block hidden -mx-6 rounded-lg" />
        <span className="relative">{title}</span>
      </Link>
      <div className="col-span-full">
        <MaybeOutlet open={active} />
      </div>
    </Grid>
  )
}
export default function RecordScreen() {
  const {pathname} = useLocation()
  const user = useOptionalUser()
  const data = useRouteData<LoaderData>()

  const [activeSlug] = pathname.split('/').slice(-1)
  const calls = data.calls

  return (
    <>
      <Grid className="mb-10 mt-24 lg:mb-24">
        <BackLink
          to="/call"
          className="lg-col-span-8 col-span-full lg:col-start-3"
        >
          Back to overview
        </BackLink>
      </Grid>

      <Grid as="header" className="mb-12">
        <H2 className="col-span-full lg:col-span-8 lg:col-start-3">
          Record your call, and I'll answer.
        </H2>
      </Grid>

      {user ? null : (
        <Grid>
          <div className="col-span-full lg:col-span-8 lg:col-start-3">
            <Paragraph>Please login to have your questions answered.</Paragraph>
          </div>
        </Grid>
      )}

      {user ? (
        <Grid>
          <div className="col-span-full lg:col-span-8 lg:col-start-3">
            <Record
              slug="./new"
              active={activeSlug === 'new'}
              title="Make a new recording"
            />
          </div>

          {calls.length > 0 ? (
            <ul className="col-span-full lg:col-span-8 lg:col-start-3">
              {calls.map(call => (
                <li key={call.id}>
                  <Record
                    slug={`./${call.id}`}
                    active={activeSlug === call.id}
                    title={call.title}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </Grid>
      ) : null}
    </>
  )
}
