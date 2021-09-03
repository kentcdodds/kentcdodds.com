export type Fields = {
  formId: string
  firstName: string
  email: string
  convertKitTagId: string
  convertKitFormId: string
}
export type Errors = Record<keyof Fields | 'generalError', string | null>

export type ActionData = {status: 'success'} | {status: 'error'; errors: Errors}
