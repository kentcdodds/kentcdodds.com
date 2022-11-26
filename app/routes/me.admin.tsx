import * as React from 'react'
import type {ActionFunction, LoaderFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react'
import {useTable} from 'react-table'
import type {Column} from 'react-table'
import {Grid} from '~/components/grid'
import {H1} from '~/components/typography'
import type {Await, KCDHandle} from '~/types'
import {prisma} from '~/utils/prisma.server'
import {requireAdminUser} from '~/utils/session.server'
import {
  formatDate,
  getErrorMessage,
  isTeam,
  typedBoolean,
  useDebounce,
  useDoubleCheck,
} from '~/utils/misc'
import {Button} from '~/components/button'
import clsx from 'clsx'
import {SearchIcon, ChevronUpIcon, ChevronDownIcon} from '~/components/icons'
import {Spacer} from '~/components/spacer'
import {Field} from '~/components/form-elements'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type LoaderData = Await<ReturnType<typeof getLoaderData>>
type User = LoaderData['users'][number]

const DEFAULT_LIMIT = 100

type UserFields = 'createdAt' | 'firstName' | 'email' | 'id' | 'team'
type SortOrder = 'asc' | 'desc'
type OrderField = UserFields
const isSortOrder = (s: unknown): s is SortOrder => s === 'asc' || s === 'desc'
const isOrderField = (s: unknown): s is OrderField =>
  s === 'team' ||
  s === 'id' ||
  s === 'email' ||
  s === 'firstName' ||
  s === 'createdAt'

async function getLoaderData({request}: {request: Request}) {
  const {searchParams} = new URL(request.url)
  const query = searchParams.get('q')
  const select: Record<UserFields, true> = {
    createdAt: true,
    firstName: true,
    email: true,
    id: true,
    team: true,
  }

  let order = 'asc'
  let orderField = 'createdAt'
  const spOrder = searchParams.get('order')
  const spOrderField = searchParams.get('orderField')
  if (isSortOrder(spOrder)) order = spOrder
  if (isOrderField(spOrderField)) orderField = spOrderField

  const limit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT)
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            {firstName: {contains: query}},
            {email: {contains: query}},
            {id: {contains: query}},
            isTeam(query) ? {team: {equals: query}} : null,
          ].filter(typedBoolean),
        }
      : {},
    select,
    orderBy: {[orderField]: order},
    take: limit,
  })
  return {
    users: users.map(user => ({
      ...user,
      createdAt: formatDate(user.createdAt),
    })),
  }
}

export const loader: LoaderFunction = async ({request}) => {
  await requireAdminUser(request)

  return json(await getLoaderData({request}))
}

export const action: ActionFunction = async ({request}) => {
  await requireAdminUser(request)

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  try {
    const {id, ...values} = Object.fromEntries(form)
    if (!id) return json({error: 'id is required'}, {status: 400})

    if (request.method === 'DELETE') {
      await prisma.user.delete({where: {id}})
    } else {
      await prisma.user.update({
        where: {id},
        data: values,
      })
    }
  } catch (error: unknown) {
    console.error(error)
    return json({error: getErrorMessage(error)})
  }
  return redirect(new URL(request.url).pathname)
}

const userColumns: Array<Column<User>> = [
  {
    Header: 'Created',
    accessor: 'createdAt',
  },
  {
    Header: 'ID',
    accessor: 'id',
  },
  {
    Header: 'First Name',
    accessor: 'firstName',
  },
  {
    Header: 'Team',
    accessor: 'team',
  },
  {
    Header: 'Email',
    accessor: 'email',
  },
]

function Cell({
  value,
  row: {values: user},
  column: {id: propertyName},
}: {
  value: string
  row: {values: User}
  column: {id: string}
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const dc = useDoubleCheck()

  return isEditing ? (
    propertyName === 'id' ? (
      <Form
        method="delete"
        onSubmit={() => setIsEditing(false)}
        onBlur={() => setIsEditing(false)}
        onKeyUp={e => {
          if (e.key === 'Escape') setIsEditing(false)
        }}
      >
        <input type="hidden" name="id" value={user.id} />
        <Button
          type="submit"
          variant="danger"
          autoFocus
          {...dc.getButtonProps()}
        >
          {dc.doubleCheck ? 'You sure?' : 'Delete'}
        </Button>
      </Form>
    ) : (
      <Form
        method="post"
        onSubmit={() => setIsEditing(false)}
        onBlur={() => setIsEditing(false)}
        onKeyUp={e => {
          if (e.key === 'Escape') setIsEditing(false)
        }}
      >
        <input type="hidden" name="id" value={user.id} />
        <input type="text" defaultValue={value} name={propertyName} autoFocus />
      </Form>
    )
  ) : (
    <button className="border-none" onClick={() => setIsEditing(true)}>
      {value || 'NO_VALUE'}
    </button>
  )
}

const defaultColumn = {
  Cell,
}

export default function MeAdmin() {
  const data = useLoaderData<LoaderData>()
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const [limit, setLimit] = React.useState(
    searchParams.get('limit') ?? String(DEFAULT_LIMIT),
  )
  const spOrder = searchParams.get('order')
  const spOrderField = searchParams.get('orderField')
  const [ordering, setOrdering] = React.useState({
    order: isSortOrder(spOrder) ? spOrder : 'asc',
    field: isOrderField(spOrderField) ? spOrderField : 'createdAt',
  })
  const actionData = useActionData<{error: string}>()

  const syncSearchParams = useDebounce(() => {
    if (
      searchParams.get('q') === query &&
      searchParams.get('limit') === limit
    ) {
      return
    }

    const newParams = new URLSearchParams(searchParams)
    if (query) {
      newParams.set('q', query)
    } else {
      newParams.delete('q')
    }
    if (limit && limit !== String(DEFAULT_LIMIT)) {
      newParams.set('limit', limit)
    } else {
      newParams.delete('limit')
    }
    setSearchParams(newParams, {replace: true})
  }, 400)

  React.useEffect(() => {
    syncSearchParams()
  }, [query, limit, syncSearchParams])

  React.useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    if (ordering.field === 'createdAt') {
      newParams.delete('orderField')
    } else {
      newParams.set('orderField', ordering.field)
    }
    if (ordering.order === 'asc') {
      newParams.delete('order')
    } else {
      newParams.set('order', ordering.order)
    }
    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, {replace: true})
    }
  }, [ordering, searchParams, setSearchParams])

  const {getTableProps, getTableBodyProps, headerGroups, rows, prepareRow} =
    // @ts-expect-error 🤷‍♂️ no idea why defaultColumn isn't work ing here...
    useTable({columns: userColumns, data: data.users, defaultColumn})

  return (
    <Grid>
      <div className="col-span-full">
        <H1>Admin panel</H1>
      </div>
      {actionData?.error ? (
        <>
          <Spacer size="3xs" />
          <p role="alert" className="col-span-full text-sm text-red-500">
            {actionData.error}
          </p>
        </>
      ) : null}
      <Spacer size="2xs" />
      <div className="col-span-full">
        <Form method="get">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <div className="relative flex-1">
                <button
                  title={query === '' ? 'Search' : 'Clear search'}
                  type="button"
                  onClick={() => {
                    setQuery('')
                    // manually sync immediately when the
                    // change was from a finite interaction like this click.
                    syncSearchParams()
                    searchInputRef.current?.focus()
                  }}
                  className={clsx(
                    'absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500',
                    {
                      'cursor-pointer': query !== '',
                      'cursor-default': query === '',
                    },
                  )}
                >
                  <SearchIcon />
                </button>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.currentTarget.value)}
                  name="q"
                  placeholder="Filter users"
                  className="text-primary bg-primary border-secondary focus:bg-secondary w-full rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"
                />
                <div className="absolute right-2 top-0 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
                  <span title="Total results shown">{rows.length}</span>
                </div>
              </div>
            </div>
            <Field
              label="Limit"
              name="limit"
              value={limit}
              type="number"
              step="1"
              min="1"
              max="10000"
              onChange={event => setLimit(event.currentTarget.value)}
              placeholder="results limit"
            />
          </div>
        </Form>
      </div>
      <Spacer size="2xs" />
      <div className="col-span-full overflow-x-scroll">
        <table
          {...getTableProps({
            className: 'border-slate-500 border-4',
          })}
        >
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps({
                      className: 'border-b-4 border-blue-500 font-bold',
                    })}
                  >
                    <button
                      className="flex w-full justify-center gap-1"
                      onClick={() => {
                        setOrdering(prev => {
                          const field = column.id
                          if (!isOrderField(field)) return prev

                          if (prev.field === column.id) {
                            return {
                              field,
                              order: prev.order === 'asc' ? 'desc' : 'asc',
                            }
                          } else {
                            return {field, order: 'asc'}
                          }
                        })
                      }}
                    >
                      {column.render('Header')}
                      {ordering.order === 'asc' ? (
                        <ChevronUpIcon
                          title="Asc"
                          className={clsx('ml-2 text-gray-400', {
                            'opacity-0': ordering.field !== column.id,
                          })}
                        />
                      ) : (
                        <ChevronDownIcon
                          title="Desc"
                          className={clsx('ml-2 text-gray-400', {
                            'opacity-0': ordering.field !== column.id,
                          })}
                        />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(row => {
              prepareRow(row)
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return (
                      <td
                        {...cell.getCellProps({
                          className:
                            'p-3 bg-opacity-30 bg-gray-800 border-2 border-slate-500',
                        })}
                      >
                        {cell.render('Cell')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Grid>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return (
    <div>
      <h1>Error</h1>
      <pre>{error.stack}</pre>
    </div>
  )
}

/*
eslint
  react/jsx-key: "off",
*/
