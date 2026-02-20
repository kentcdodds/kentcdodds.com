type DataWithResponseInitLike<Data> = {
	data: Data
	init: ResponseInit | null
	type: string
}

type SerializeResult<Result> = Result extends Response
	? never
	: Result extends DataWithResponseInitLike<infer Data>
		? Data
		: Result

export type SerializeFrom<T> =
	T extends (...args: Array<any>) => infer Return
		? SerializeResult<Awaited<Return>>
		: T
