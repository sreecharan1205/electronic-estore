import { Button, Group, PasswordInput, Switch, TextInput } from "@mantine/core"
import type { ActionFunction } from "@remix-run/node"
import { Link, useFetcher, useSearchParams } from "@remix-run/react"
import { createUserSession } from "~/lib/session.server"
import { verifyLogin } from "~/lib/user.server"
import { LoginSchema } from "~/lib/zod.schema"
import { badRequest, safeRedirect } from "~/utils/misc.server"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fieldErrors, fields } = await validateAction(request, LoginSchema)

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors })
  }

  const { email, password, redirectTo, remember } = fields

  const user = await verifyLogin(email, password)
  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: "Invalid username or password",
      },
    })
  }

  return createUserSession({
    request,
    userId: user.id,
    role: user.role,
    remember: remember === "on" ? true : false,
    redirectTo: safeRedirect(redirectTo),
  })
}

export default function Login() {
  const [searchParams] = useSearchParams()

  const fetcher = useFetcher<ActionData>()
  const actionData = fetcher.data

  const redirectTo = searchParams.get("redirectTo") || "/"
  const isSubmitting = fetcher.state !== "idle"

  return (
    <>
      <div className="relative isolate flex min-h-full flex-col justify-center">
        <div className="relative mx-auto w-full max-w-md rounded-lg border-2 border-black p-6 px-8">
          <div className="flex items-center justify-center pb-4 text-3xl">
            <h3 className="text-black">Welcome to E-Store!</h3>
          </div>
          <fetcher.Form method="post" replace className="mt-8">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
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

              <Group
                mt="1rem"
                className="items flex items-center justify-center"
              >
                <Switch
                  id="remember-me"
                  name="rememberMe"
                  label="Remember me"
                  color="gray"
                  className="text-white"
                />
                <div className="text-center text-sm text-black">
                  Don't have an account?{" "}
                  <Link
                    className="text-black underline hover:text-gray-500"
                    to={{
                      pathname: "/register",
                      search: searchParams.toString(),
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              </Group>

              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                loaderPosition="right"
                mt="1rem"
              >
                Sign in
              </Button>
            </fieldset>
          </fetcher.Form>
        </div>
      </div>

      {/* <fetcher.Form method="post" replace className="mt-8">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
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

          <Group position="apart" mt="1rem">
            <Switch id="remember-me" name="rememberMe" label="Remember me" />
          </Group>

          <Button
            type="submit"
            loading={isSubmitting}
            fullWidth
            loaderPosition="right"
            mt="1rem"
          >
            Sign in
          </Button>
        </fieldset>
      </fetcher.Form> */}
    </>
  )
}
