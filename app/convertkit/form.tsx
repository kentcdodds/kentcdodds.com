import { useFetcher } from '@remix-run/react'
import * as React from 'react'
import { type ActionData } from './types.ts'
import { ArrowButton } from '~/components/arrow-button.tsx'
import { Field } from '~/components/form-elements.tsx'
import { CheckIcon } from '~/components/icons.tsx'
import { useRootData } from '~/utils/use-root-data.ts'

function ConvertKitForm({
	formId,
	convertKitTagId,
	convertKitFormId,
}: { formId: string } & (
	| { convertKitTagId?: never; convertKitFormId: string }
	| { convertKitTagId: string; convertKitFormId?: never }
	| { convertKitTagId: string; convertKitFormId: string }
)) {
	const websiteId = React.useId()
	const convertKit = useFetcher<ActionData>()
	const formRef = React.useRef<HTMLFormElement>(null)
	const isDone = convertKit.state === 'idle' && convertKit.data != null
	const convertKitData = isDone ? convertKit.data : null
	React.useEffect(() => {
		if (formRef.current && convertKitData?.status === 'success') {
			formRef.current.reset()
		}
	}, [convertKitData])

	const { user, userInfo } = useRootData()

	const alreadySubscribed = userInfo?.convertKit?.tags.some(
		({ id }) => id === convertKitTagId,
	)

	if (alreadySubscribed) {
		return (
			<div>{`Actually, it looks like you're already signed up to be notified.`}</div>
		)
	}

	const success = isDone && convertKitData?.status === 'success'

	return (
		<convertKit.Form
			ref={formRef}
			action="/action/convert-kit"
			method="POST"
			noValidate
		>
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
			<input type="hidden" name="convertKitTagId" value={convertKitTagId} />
			<input type="hidden" name="convertKitFormId" value={convertKitFormId} />
			<Field
				name="firstName"
				label="First name"
				error={
					convertKitData?.status === 'error'
						? convertKitData.errors.firstName
						: null
				}
				autoComplete="given-name"
				defaultValue={user?.firstName}
				required
				disabled={convertKit.state !== 'idle' || success}
			/>

			<Field
				name="email"
				label="Email"
				autoComplete="email"
				error={
					convertKitData?.status === 'error'
						? convertKitData.errors.email
						: null
				}
				defaultValue={user?.email}
				disabled={convertKit.state !== 'idle' || success}
			/>

			{success ? (
				<div className="flex">
					<CheckIcon />
					<p className="text-secondary">
						{userInfo?.convertKit
							? `Sweet, you're all set`
							: `Sweet, check your email for confirmation.`}
					</p>
				</div>
			) : (
				<ArrowButton className="pt-4" type="submit" direction="right">
					Sign me up
				</ArrowButton>
			)}
		</convertKit.Form>
	)
}

export { ConvertKitForm }
