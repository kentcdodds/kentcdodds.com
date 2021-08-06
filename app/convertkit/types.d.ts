export type ActionData = {
  state: 'error' | 'success'
  fields: {
    firstName: string
    email: string
    convertKitTagId: string
    convertKitFormId: string
  }
  errors: {
    generalError?: string
    firstName?: string | null
    email?: string | null
    convertKitTagId?: string | null
    convertKitFormId?: string | null
  }
}
