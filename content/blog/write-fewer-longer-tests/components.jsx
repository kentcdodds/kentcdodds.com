import * as React from 'react'
import * as api from './api'

function Rendered(props) {
  return (
    <div
      style={{
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        marginBottom: 20,
      }}
      {...props}
    />
  )
}

function Course({courseId}) {
  const [state, setState] = React.useState({
    loading: false,
    course: null,
    error: null,
  })
  const {loading, course, error} = state
  React.useEffect(() => {
    setState({loading: true, course: null, error: null})
    api.getCourseInfo(courseId).then(
      data => setState({loading: false, course: data, error: null}),
      e => setState({loading: false, course: null, error: e}),
    )
  }, [courseId])
  return (
    <>
      <div role="alert" aria-live="polite">
        {loading ? 'Loading...' : error ? error.message : null}
      </div>
      {course ? <CourseInfo course={course} /> : null}
    </>
  )
}

function CourseInfo({course}) {
  const {title, subtitle, topics} = course
  return (
    <div>
      <h1>{title}</h1>
      <strong>{subtitle}</strong>
      <ul>
        {topics.map(t => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

function Remounter({children}) {
  const [key, setKey] = React.useState(0)

  return (
    <div>
      <div>
        <button onClick={() => setKey(k => k + 1)}>Re-mount</button>
      </div>
      <div key={key}>{children}</div>
    </div>
  )
}

function Example() {
  return (
    <Rendered>
      <Remounter>
        <Course />
      </Remounter>
    </Rendered>
  )
}

export {Example, Course, Rendered, Remounter}
