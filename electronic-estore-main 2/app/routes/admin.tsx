import { ActionIcon, Avatar, Menu, ScrollArea } from "@mantine/core"
import type { LoaderArgs, SerializeFrom } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import type { ShouldReloadFunction } from "@remix-run/react"
import { Form, Link, NavLink, Outlet } from "@remix-run/react"
import { ChevronDownIcon } from "lucide-react"
import { isCustomer, requireUser } from "~/lib/session.server"
import { useOptionalUser } from "~/utils/hooks"

export type AppLoaderData = SerializeFrom<typeof loader>
export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  if (await isCustomer(request)) {
    return redirect("/")
  }

  return json({})
}

export default function AppLayout() {
  return (
    <>
      <div className="flex h-full flex-col">
        <HeaderComponent />
        <ScrollArea classNames={{ root: "flex-1 bg-black" }}>
          <main>
            <Outlet />
          </main>
        </ScrollArea>

        <FooterComponent />
      </div>
    </>
  )
}

const adminActions = [
  {
    title: "Home",
    href: "/admin",
  },
  {
    title: "Orders",
    href: "/admin/orders",
  },
  {
    title: "Categories",
    href: "/admin/categories",
  },
]

function HeaderComponent() {
  const { user } = useOptionalUser()

  return (
    <div>
      <Form replace action="/api/auth/logout" method="post" id="logout-form" />
      <div className="flex h-10 items-center justify-between bg-black p-8">
        <div className="flex items-center">
          <div className="flex items-center justify-center">
            <Link to="/">
              <span className="text-2xl text-white">E</span>
              <span className="text-white">-</span>
              <span className="text-base text-white">store</span>
            </Link>
          </div>
        </div>
        <div className="flex justify-between gap-12">
          {adminActions.map((adminAction, idx) => (
            <div key={idx}>
              <NavLink
                to={adminAction.href}
                className={({ isActive }) =>
                  `text-lg ${
                    isActive ? "text-white" : "text-zinc-400"
                  } hover:text-white`
                }
              >
                {adminAction.title}
              </NavLink>
            </div>
          ))}
        </div>

        <div className="flex items-center hover:cursor-pointer">
          <Menu shadow="xl" width={200} position="bottom-end">
            <Menu.Target>
              <div>
                {user ? (
                  <>
                    <div className="border-1 flex items-center justify-between gap-2">
                      <Avatar src="" alt="" radius="lg" color="red">
                        {user.name.charAt(0)}
                      </Avatar>
                      <div className="flex items-center ">
                        <p className="text-xs text-white">{user.name}</p>
                      </div>
                      <div>
                        <ActionIcon variant="transparent" color="white">
                          <ChevronDownIcon size={10} />
                        </ActionIcon>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar src="" alt="" radius="lg" color="red" />
                  </>
                )}
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              {user ? (
                <>
                  <Menu.Item className="text-gray-800">{user.name}</Menu.Item>
                  <Menu.Item>{user.email}</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item type="submit" form="logout-form">
                    Logout
                  </Menu.Item>
                </>
              ) : (
                <>
                  <Menu.Item component={Link} to="/auth/login">
                    Login
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item component={Link} to="/auth/register">
                    Create account
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
    </div>
  )
}

function FooterComponent() {
  return <div className="flex items-center justify-center bg-black"></div>
}

export const unstable_shouldReload: ShouldReloadFunction = ({
  submission,
  prevUrl,
  url,
}) => {
  if (!submission && prevUrl.pathname === url.pathname) {
    return false
  }

  return true
}
