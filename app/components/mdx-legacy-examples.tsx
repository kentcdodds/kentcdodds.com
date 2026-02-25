import TheSpectrumOfAbstraction from '#content/blog/aha-testing/the-spectrum-of-abstraction.tsx'
import { Login } from '#content/blog/avoid-nesting-when-youre-testing/components.jsx'
import UserProfileExample from '#content/blog/avoid-the-test-user/user-profile-example.jsx'
import { BadApp, GoodApp } from '#content/blog/dont-call-a-react-function-component/components.jsx'
import {
	UsernameForm,
	UsernameFormClass,
	UsernameFormClassDemo,
	UsernameFormClassWithBug,
	UsernameFormClassWithBugDemo,
} from '#content/blog/fix-the-not-wrapped-in-act-warning/components.jsx'
import { Counter as SlowRenderCounter } from '#content/blog/fix-the-slow-render-before-you-fix-the-re-render/components.jsx'
import { UseUndoExample } from '#content/blog/how-to-test-custom-react-hooks/use-undo.example.jsx'
import {
	Add,
	AddWithInput,
} from '#content/blog/props-vs-state/components.jsx'
import {
	FixedBugApp,
	HiddenBugApp,
	RevealedBugApp,
} from '#content/blog/react-hooks-pitfalls/components.jsx'
import {
	App as StateColocationApp,
	FastApp,
} from '#content/blog/state-colocation-will-make-your-react-app-faster/components.jsx'
import {
	BugReproduced,
	FinishedCounter,
	InitialCounterAlmostThere,
	KeyPropReset,
	SimpleCounter,
} from '#content/blog/the-state-initializer-pattern/components.tsx'
import {
	BrokenContact,
	CounterParent,
	WorkingContact,
} from '#content/blog/understanding-reacts-key-prop/components.jsx'
import {
	BoundaryApp,
	RecoveryApp,
	TryCatchApp,
} from '#content/blog/use-react-error-boundary-to-handle-errors-in-react/components/index.jsx'
import {
	DelayedCounterBug,
	DelayedCounterWorking,
} from '#content/blog/use-state-lazy-initialization-and-function-updates/components.jsx'
import {
	CandyDispenser,
	Poll,
} from '#content/blog/usememo-and-usecallback/components.tsx'
import { Example } from '#content/blog/write-fewer-longer-tests/components.jsx'

function Rendered(props: React.ComponentPropsWithoutRef<'div'>) {
	const { className, ...rest } = props
	return <div className={['demo', className].filter(Boolean).join(' ')} {...rest} />
}

function Layout(props: React.ComponentPropsWithoutRef<'div'>) {
	const { className, style, ...rest } = props
	return (
		<div
			className={['demo', className].filter(Boolean).join(' ')}
			style={{ minHeight: 900, ...style }}
			{...rest}
		/>
	)
}

export {
	Add,
	AddWithInput,
	BadApp,
	BoundaryApp,
	BrokenContact,
	BugReproduced,
	CandyDispenser,
	CounterParent,
	DelayedCounterBug,
	DelayedCounterWorking,
	Example,
	FastApp,
	FinishedCounter,
	FixedBugApp,
	GoodApp,
	HiddenBugApp,
	InitialCounterAlmostThere,
	KeyPropReset,
	Layout,
	Login,
	Poll,
	RecoveryApp,
	Rendered,
	RevealedBugApp,
	SimpleCounter,
	SlowRenderCounter,
	StateColocationApp,
	TheSpectrumOfAbstraction,
	TryCatchApp,
	UseUndoExample,
	UserProfileExample,
	UsernameForm,
	UsernameFormClass,
	UsernameFormClassDemo,
	UsernameFormClassWithBug,
	UsernameFormClassWithBugDemo,
	WorkingContact,
}
