import * as React from 'react'
import { useFetcher } from 'react-router';
import { ArrowButton } from '#app/components/arrow-button.tsx'
import { Field } from '#app/components/form-elements.tsx'
import { CheckIcon } from '#app/components/icons.tsx'
import { useRootData } from '#app/utils/use-root-data.ts'
import { type ActionData } from './types.ts'

function KitForm({
	formId,
	kitTagId,
	kitFormId,
}: { formId: string } & (
	| { kitTagId?: never; kitFormId: string }
	| { kitTagId: string; kitFormId?: never }
	| { kitTagId: string; kitFormId: string }
)) {
	const websiteId = React.useId()
	const kit = useFetcher<ActionData>()
	const formRef = React.useRef<HTMLFormElement>(null)
	const isDone = kit.state === 'idle' && kit.data != null
	const kitData = isDone ? kit.data : null
	React.useEffect(() => {
		if (formRef.current && kitData?.status === 'success') {
			formRef.current.reset()
		}
	}, [kitData])

	const { user, userInfo } = useRootData()

	const alreadySubscribed = userInfo?.kit?.tags.some(
		({ id }) => id === kitTagId,
	)

	if (alreadySubscribed) {
		return (
			<div>{`Actually, it looks like you're already signed up to be notified.`}</div>
		)
	}

	const success = isDone && kitData?.status === 'success'

	return (
		<kit.Form ref={formRef} action="/action/kit" method="POST" noValidate>
			<div style={{ position: 'absolute', left: '-9999px' }}>
				<label htmlFor={`website-url-${websiteId}`}>Your website</label>
				<input
					type="text"
					id={`website-url-${websiteId}`}
					name="url"
					tabIndex={-1}
					autoComplete="nope"
				/>
			</div>
			<input type="hidden" name="formId" value={formId} />
			<input type="hidden" name="kitTagId" value={kitTagId} />
			<input type="hidden" name="kitFormId" value={kitFormId} />
			<Field
				name="firstName"
				label="First name"
				error={kitData?.status === 'error' ? kitData.errors.firstName : null}
				autoComplete="given-name"
				defaultValue={user?.firstName}
				required
				disabled={kit.state !== 'idle' || success}
			/>

			<Field
				name="email"
				label="Email"
				autoComplete="email"
				error={kitData?.status === 'error' ? kitData.errors.email : null}
				defaultValue={user?.email}
				disabled={kit.state !== 'idle' || success}
			/>

			{success ? (
				<div className="flex">
					<CheckIcon />
					<p className="text-secondary">
						{userInfo?.kit
							? `Sweet, you're all set`
							: `Sweet, check your email for confirmation.`}
					</p>
				</div>
			) : (
				<ArrowButton className="pt-4" type="submit" direction="right">
					Sign me up
				</ArrowButton>
			)}
		</kit.Form>
	)
}

export { KitForm }
