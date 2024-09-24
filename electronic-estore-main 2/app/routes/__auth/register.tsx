import { Button, PasswordInput, Textarea, TextInput } from "@mantine/core"
import { DatePicker } from "@mantine/dates"
import { Role } from "@prisma/client"
import type { ActionFunction } from "@remix-run/node"
import { Form, Link, useActionData, useTransition } from "@remix-run/react"
import { createUserSession } from "~/lib/session.server"
import { createUser, getUserByEmail } from "~/lib/user.server"
import { badRequest, validateEmail, validateName } from "~/utils/misc.server"

interface ActionData {
  fieldErrors?: {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    name?: string
    dob?: string
  }
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()

  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")
  const firstName = formData.get("firstName")?.toString()
  const lastName = formData.get("lastName")?.toString()
  const name = formData.get("name")?.toString()
  const dob = formData.get("dob")?.toString()
  const address = formData.get("address")?.toString()

  if (!validateName(firstName)) {
    return badRequest<ActionData>({
      fieldErrors: {
        firstName: "Name is required",
      },
    })
  }

  if (!validateName(lastName)) {
    return badRequest<ActionData>({
      fieldErrors: {
        lastName: "Name is required",
      },
    })
  }

  if (!validateName(name)) {
    return badRequest<ActionData>({
      fieldErrors: {
        name: "Name is required",
      },
    })
  }

  if (!dob) {
    return badRequest<ActionData>({
      fieldErrors: {
        dob: "Date of birth is required",
      },
    })
  }

  if (!validateEmail(email)) {
    return badRequest<ActionData>({
      fieldErrors: { email: "Email is invalid" },
    })
  }

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return badRequest<ActionData>({
      fieldErrors: { password: "Password is required" },
    })
  }

  if (password.length < 8 || confirmPassword.length < 8) {
    return badRequest<ActionData>({
      fieldErrors: { password: "Password is too short" },
    })
  }

  if (password !== confirmPassword) {
    return badRequest<ActionData>({
      fieldErrors: { password: "Passwords do not match" },
    })
  }

  const existingUser = await getUserByEmail(email)
  if (existingUser) {
    return badRequest<ActionData>({
      fieldErrors: { email: "A user already exists with this email" },
    })
  }

  const user = await createUser({
    email,
    password,
    firstName,
    lastName,
    name,
    dob: new Date(dob),
    address,
  })
  return createUserSession({
    request,
    userId: user.id,
    role: Role.CUSTOMER,
    redirectTo: "/",
  })
}
export default function Register() {
  const transition = useTransition()
  const actionData = useActionData<ActionData>()
  const isSubmitting = transition.state !== "idle"

  return (
    <>
      <div className="relative isolate flex min-h-full flex-col justify-center">
        <div className="relative mx-auto w-full max-w-md rounded-lg border-2 border-black p-6 px-8">
          <div className="flex items-center justify-center pb-4 text-3xl">
            <h3 className="text-black">Welcome to E-Store!</h3>
          </div>
          <Form replace method="post" className="mt-8">
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <TextInput
                name="firstName"
                label="First Name"
                error={actionData?.fieldErrors?.firstName}
                required
              />
              <TextInput
                name="lastName"
                label="Last Name"
                error={actionData?.fieldErrors?.lastName}
                required
              />
              <TextInput
                name="name"
                label="User Name"
                error={actionData?.fieldErrors?.name}
                required
              />

              <DatePicker
                name="dob"
                label="Date of Birth"
                error={actionData?.fieldErrors?.dob}
                required
              />

              <TextInput
                name="email"
                type="email"
                autoComplete="email"
                label="Email address"
                error={actionData?.fieldErrors?.email}
                required
              />

              <PasswordInput
                name="password"
                label="Password"
                error={actionData?.fieldErrors?.password}
                autoComplete="current-password"
                required
              />

              <PasswordInput
                name="confirmPassword"
                label="Confirm password"
                error={actionData?.fieldErrors?.password}
                autoComplete="current-password"
                required
              />

              <Textarea
                name="address"
                label="Address"
                autoComplete="street-address"
              />

              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                loaderPosition="right"
                mt="1rem"
              >
                Register
              </Button>
              <div className="flex items-center justify-center">
                <div className="text-center text-sm text-black">
                  Already have an account?{" "}
                  <Link
                    className="text-black underline hover:text-gray-500"
                    to="/login"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </fieldset>
          </Form>
        </div>
      </div>
    </>
  )
}
