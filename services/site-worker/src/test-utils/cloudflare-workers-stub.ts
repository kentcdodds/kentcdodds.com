export class WorkerEntrypoint<Env = unknown> {
	ctx: ExecutionContext
	env: Env

	constructor(ctx: ExecutionContext, env: Env) {
		this.ctx = ctx
		this.env = env
	}
}
