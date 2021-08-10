export type ActionData = {
  fields: {
    formId: string
    _redirect: string
    firstName: string
    email: string
    convertKitTagId: string
    convertKitFormId: string
  }
  errors: {
    generalError?: string
    _redirect?: string
    formId?: string | null
    firstName?: string | null
    email?: string | null
    convertKitTagId?: string | null
    convertKitFormId?: string | null
  }
}

export type LoaderData = {
  status?: 'success'
  fields: {
    formId?: string
    firstName?: string
    email?: string
  }
}
