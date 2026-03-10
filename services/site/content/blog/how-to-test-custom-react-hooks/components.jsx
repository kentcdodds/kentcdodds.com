function Rendered(props) {
	const { className, ...rest } = props
	return (
		<div className={['demo', className].filter(Boolean).join(' ')} {...rest} />
	)
}

export { Rendered }
