import { type UNSAFE_DataWithResponseInit as DataWithResponseInit } from 'react-router'

type SerializeResult<Result> = Result extends Response
	? never
	: Result extends DataWithResponseInit<infer Data>
		? Data
		: Result

export type SerializeFrom<T> =
	T extends (...args: Array<any>) => infer Return
		? SerializeResult<Awaited<Return>>
		: T
