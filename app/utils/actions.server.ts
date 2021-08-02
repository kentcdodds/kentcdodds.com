import {json} from 'remix'
import type {NonNullProperties, Request, Response} from 'types'
import {getErrorMessage, getNonNull} from './misc'

type ErrorMessage = string
type NoError = null
type FormValue = string | null
type FormValueValidator = (
  formValue: FormValue,
) => Promise<ErrorMessage | NoError> | ErrorMessage | NoError

async function handleFormSubmission<
  ActionData extends {
    fields: {[field: string]: FormValue}
    errors: {[field: string]: ErrorMessage | NoError}
  },
>(
  requestOrForm: Request | URLSearchParams,
  validate: {[Key in keyof ActionData['errors']]: FormValueValidator},
  handleFormValues: (
    formValues: NonNullProperties<ActionData['fields']>,
  ) => Response | Promise<Response>,
): Promise<Response> {
  // @ts-expect-error ts(2322) 🤷‍♂️
  const actionData: ActionData = {fields: {}, errors: {}}

  try {
    let form: URLSearchParams
    if (requestOrForm instanceof URLSearchParams) {
      form = requestOrForm
    } else {
      const requestText = await requestOrForm.text()
      form = new URLSearchParams(requestText)
    }

    await Promise.all(
      Object.entries(validate).map(async ([fieldName, validator]) => {
        const formValue = form.get(fieldName)
        actionData.fields[fieldName] = formValue
        actionData.errors[fieldName] = await validator(formValue)
      }),
    )

    if (Object.values(actionData.errors).some(err => err !== null)) {
      return json(actionData, 401)
    }

    const nonNullFields = getNonNull(actionData.fields)
    // not sure why, but it wasn't happy without the type cast 🤷‍♂️
    const response = await handleFormValues(
      nonNullFields as NonNullProperties<ActionData['fields']>,
    )
    return response
  } catch (error: unknown) {
    actionData.errors.generalError = getErrorMessage(error)
    return json(actionData, 500)
  }
}

export {handleFormSubmission}
