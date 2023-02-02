import type {DataFunctionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
  Form,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import {getAllInstances, getInstanceInfo} from 'litefs-js'
import {ensureInstance} from 'litefs-js/remix'
import {H2, H3} from '~/components/typography'
import {
  cache,
  getAllCacheKeys,
  lruCache,
  searchCacheKeys,
} from '~/utils/cache.server'
import {requireAdminUser} from '~/utils/session.server'
import {Spacer} from '~/components/spacer'
import {Button} from '~/components/button'
import {useDebounce, useDoubleCheck} from '~/utils/misc'
import {Field, FieldContainer, inputClassName} from '~/components/form-elements'
import {SearchIcon} from '~/components/icons'

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  const searchParams = new URL(request.url).searchParams
  const query = searchParams.get('query')
  const limit = Number(searchParams.get('limit') ?? 100)

  const currentInstanceInfo = await getInstanceInfo()
  const instance =
    searchParams.get('instance') ?? currentInstanceInfo.currentInstance
  const instances = await getAllInstances()
  await ensureInstance(instance)

  let cacheKeys: {sqlite: Array<string>; lru: Array<string>}
  if (typeof query === 'string') {
    cacheKeys = await searchCacheKeys(query, limit)
  } else {
    cacheKeys = await getAllCacheKeys(limit)
  }
  return json({cacheKeys, instance, instances, currentInstanceInfo})
}

export async function action({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  const formData = await request.formData()
  const key = formData.get('cacheKey')
  const {currentInstance} = await getInstanceInfo()
  const instance = formData.get('instance') ?? currentInstance
  const type = formData.get('type')

  invariant(typeof key === 'string', 'cacheKey must be a string')
  invariant(typeof type === 'string', 'type must be a string')
  invariant(typeof instance === 'string', 'instance must be a string')
  await ensureInstance(instance)

  switch (type) {
    case 'sqlite': {
      await cache.delete(key)
      break
    }
    case 'lru': {
      lruCache.delete(key)
      break
    }
    default: {
      throw new Error(`Unknown cache type: ${type}`)
    }
  }
  return json({success: true})
}

export default function CacheAdminRoute() {
  const data = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const submit = useSubmit()
  const query = searchParams.get('query') ?? ''
  const limit = searchParams.get('limit') ?? '100'
  const instance = searchParams.get('instance') ?? data.instance

  const handleFormChange = useDebounce((form: HTMLFormElement) => {
    submit(form)
  }, 400)

  return (
    <div className="mx-10vw">
      <H2 className="mt-3">Cache Admin</H2>
      <Spacer size="2xs" />
      <Form
        method="get"
        className="flex flex-col gap-4"
        onChange={e => handleFormChange(e.currentTarget)}
      >
        <div className="flex-1">
          <div className="relative flex-1">
            <button
              type="submit"
              className="absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500"
            >
              <SearchIcon />
            </button>
            <input
              type="search"
              defaultValue={query}
              name="query"
              placeholder="Filter Cache Keys"
              className="text-primary bg-primary border-secondary focus:bg-secondary w-full rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"
            />
            <div className="absolute right-2 top-0 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
              <span title="Total results shown">
                {data.cacheKeys.sqlite.length + data.cacheKeys.lru.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Field
            label="Limit"
            name="limit"
            defaultValue={limit}
            type="number"
            step="1"
            min="1"
            max="10000"
            placeholder="results limit"
          />
          <FieldContainer label="Instance" id="instance">
            {({inputProps}) => (
              <select
                {...inputProps}
                name="instance"
                defaultValue={instance}
                className={inputClassName}
              >
                {Object.entries(data.instances).map(([inst, region]) => (
                  <option key={inst} value={inst}>
                    {[
                      inst,
                      `(${region})`,
                      inst === data.currentInstanceInfo.currentInstance
                        ? '(current)'
                        : '',
                      inst === data.currentInstanceInfo.primaryInstance
                        ? ' (primary)'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </option>
                ))}
              </select>
            )}
          </FieldContainer>
        </div>
      </Form>
      <Spacer size="2xs" />
      <div className="flex flex-col gap-4">
        <H3>LRU Cache:</H3>
        {data.cacheKeys.lru.map(key => (
          <CacheKeyRow
            key={key}
            cacheKey={key}
            instance={instance}
            type="lru"
          />
        ))}
      </div>
      <Spacer size="3xs" />
      <div className="flex flex-col gap-4">
        <H3>SQLite Cache:</H3>
        {data.cacheKeys.sqlite.map(key => (
          <CacheKeyRow
            key={key}
            cacheKey={key}
            instance={instance}
            type="sqlite"
          />
        ))}
      </div>
    </div>
  )
}

function CacheKeyRow({
  cacheKey,
  instance,
  type,
}: {
  cacheKey: string
  instance?: string
  type: string
}) {
  const fetcher = useFetcher()
  const dc = useDoubleCheck()
  return (
    <div className="flex items-center gap-2 font-mono">
      <fetcher.Form method="post">
        <input type="hidden" name="cacheKey" value={cacheKey} />
        <input type="hidden" name="instance" value={instance} />
        <input type="hidden" name="type" value={type} />
        <Button
          size="small"
          variant="danger"
          {...dc.getButtonProps({type: 'submit'})}
        >
          {fetcher.state === 'idle'
            ? dc.doubleCheck
              ? 'You sure?'
              : 'Delete'
            : 'Deleting...'}
        </Button>
      </fetcher.Form>
      <a
        href={`/resources/cache/${type}/${encodeURIComponent(
          cacheKey,
        )}?instance=${instance}`}
      >
        {cacheKey}
      </a>
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)

  return <div>An unexpected error occurred: {error.message}</div>
}
