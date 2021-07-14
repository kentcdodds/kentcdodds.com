function getErrorForDescription(description: string | null) {
  if (!description) return `Description is required`

  const minLength = 20
  const maxLength = 1000
  if (description.length < minLength) {
    return `Description must be at least ${minLength} characters`
  }
  if (description.length > maxLength) {
    return `Description must be no longer than ${maxLength} characters`
  }
  return null
}

function getErrorForTitle(title: string | null) {
  if (!title) return `Title is required`

  const minLength = 5
  const maxLength = 100
  if (title.length < minLength) {
    return `Title must be at least ${minLength} characters`
  }
  if (title.length > maxLength) {
    return `Title must be no longer than ${maxLength} characters`
  }
  return null
}

function getErrorForKeywords(keywords: string | null) {
  if (!keywords) return `Keywords is required`

  const minLength = 2
  const maxLength = 100
  if (keywords.length < minLength) {
    return `Keywords must be at least ${minLength} characters`
  }
  if (keywords.length > maxLength) {
    return `Keywords must be no longer than ${maxLength} characters`
  }
  return null
}

function getErrorForAudio(audio: string | null) {
  if (!audio) return 'Audio file is required'
  return null
}

export {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
}
