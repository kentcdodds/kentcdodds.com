import * as React from 'react'
import type {LoaderFunction, ActionFunction} from 'remix'
import {json, redirect, useLoaderData, useActionData, Form} from 'remix'
import {useTable} from 'react-table'
import type {Column} from 'react-table'
import {Grid} from '~/components/grid'
import {H1} from '~/components/typography'
import type {Await} from '~/types'
import {prismaRead, prismaWrite} from '~/utils/prisma.server'
import {requireAdminUser} from '~/utils/session.server'
import {getErrorMessage} from '~/utils/misc'

type LoaderData = Await<ReturnType<typeof getLoaderData>>
type User = LoaderData['users'][number]

async function getLoaderData() {
  const users = await prismaRead.user.findMany({
    select: {
      firstName: true,
      email: true,
      id: true,
      team: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
  return {users}
}

export const loader: LoaderFunction = async ({request}) => {
  await requireAdminUser(request)

  return json(await getLoaderData())
}

export const action: ActionFunction = async ({request}) => {
  await requireAdminUser(request)

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  try {
    const {id, ...values} = Object.fromEntries(form)
    if (!id) return json({error: 'id is required'}, {status: 400})

    await prismaWrite.user.update({
      where: {id},
      data: values,
    })
  } catch (error: unknown) {
    console.error(error)
    return json({error: getErrorMessage(error)})
  }
  return redirect(new URL(request.url).pathname)
}

const userColumns: Array<Column<LoaderData['users'][number]>> = [
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
  if (propertyName === 'id') return value

  return isEditing ? (
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
  const actionData = useActionData<{error: string}>()

  const {getTableProps, getTableBodyProps, headerGroups, rows, prepareRow} =
    useTable({columns: userColumns, data: data.users, defaultColumn})

  return (
    <Grid>
      <div className="col-span-full">
        <H1>Admin panel</H1>
      </div>
      {actionData?.error ? (
        <p role="alert" className="col-span-full text-red-500 text-sm">
          {actionData.error}
        </p>
      ) : null}
      <div className="col-span-full">
        <table {...getTableProps({className: 'border-blueGray-500 border-4'})}>
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps({
                      className: 'border-b-4 border-blue-500 font-bold',
                    })}
                  >
                    {column.render('Header')}
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
                            'p-3 bg-opacity-30 bg-gray-800 border-2 border-blueGray-500',
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
