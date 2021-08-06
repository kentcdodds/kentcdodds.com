import {Form, useActionData} from 'remix'
import * as React from 'react'
import {Outlet} from 'react-router-dom'
import {useOptionalUser} from '../utils/providers'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {H2} from '../components/typography'
import {ErrorPanel, Field, InputError} from '../components/form-elements'
import {Grid} from '../components/grid'
import type {ActionData} from '../utils/contact'

export default function ContactRoute() {
  const actionData = useActionData<ActionData>()
  const user = useOptionalUser()

  return (
    <div>
      <HeroSection
        title="Send me an email."
        subtitle="Like in the old days."
        image={
          <img
            className="rounded-br-[25%] rounded-tl-[25%] max-h-50vh rounded-bl-3xl rounded-tr-3xl"
            src={images.kentProfile()}
            alt={images.kentProfile.alt}
          />
        }
      />

      <main>
        <Form method="post" noValidate aria-describedby="contact-form-error">
          <InputError id="contact-form-error">
            {actionData?.errors.generalError}
          </InputError>
          <Grid>
            <div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
              <H2>Contact Kent C. Dodds</H2>
            </div>

            <div className="col-span-full lg:col-span-8 lg:col-start-3">
              <Field
                name="name"
                label="Name"
                placeholder="Your name"
                defaultValue={actionData?.fields.name ?? user?.firstName ?? ''}
                error={actionData?.errors.name}
              />
              <Field
                type="email"
                label="Email"
                placeholder="person.doe@example.com"
                defaultValue={actionData?.fields.email ?? user?.email ?? ''}
                name="email"
                error={actionData?.errors.email}
              />
              <Field
                name="subject"
                label="Subject"
                placeholder="No subject"
                defaultValue={actionData?.fields.subject ?? ''}
                error={actionData?.errors.subject}
              />
              <Field
                name="body"
                label="Body"
                type="textarea"
                placeholder="A clear and concise message works wonders."
                rows={8}
                defaultValue={actionData?.fields.body ?? ''}
                error={actionData?.errors.body}
              />
              <Outlet />
              {actionData?.errors.generalError ? (
                <ErrorPanel>{actionData.errors.generalError}</ErrorPanel>
              ) : null}
            </div>
          </Grid>
        </Form>
      </main>
    </div>
  )
}
