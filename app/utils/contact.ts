function getErrorForName(name?: string | null) {
  if (!name) return `Name is required`
  if (name.length > 60) return `Name is too long`
  return null
}

function getErrorForEmail(email?: string | null) {
  if (!email) return `Email is required`
  if (!/^.+@.+\..+$/.test(email)) return `That's not an email`
  return null
}

function getErrorForSubject(subject?: string | null) {
  if (!subject) return `Subject is required`
  if (subject.length <= 5) return `Subject is too short`
  if (subject.length > 120) return `Subject is too long`
  return null
}

function getErrorForBody(body?: string | null) {
  if (!body) return `Body is required`
  if (body.length <= 40) return `Body is too short`
  if (body.length > 1001) return `Body is too long`
  return null
}

type ActionData = {
  fields: {
    name?: string | null
    email?: string | null
    subject?: string | null
    body?: string | null
  }
  errors: {
    generalError?: string
    name?: string | null
    email?: string | null
    subject?: string | null
    body?: string | null
  }
}

export {getErrorForName, getErrorForEmail, getErrorForSubject, getErrorForBody}
export type {ActionData}
