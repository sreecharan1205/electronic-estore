import { ShoppingCartIcon } from "@heroicons/react/24/outline"
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid"
import {
  ActionIcon,
  Avatar,
  Button,
  Group,
  Indicator,
  Menu,
  ScrollArea,
  Text,
} from "@mantine/core"
import type { SpotlightAction } from "@mantine/spotlight"
import { SpotlightProvider, useSpotlight } from "@mantine/spotlight"
import type { LoaderArgs, SerializeFrom } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import type { ShouldReloadFunction } from "@remix-run/react"
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useNavigate,
} from "@remix-run/react"
import appConfig from "app.config"
import { ChevronDownIcon } from "lucide-react"
import * as React from "react"
import { useCart } from "~/context/CartContext"
import { getAllProducts } from "~/lib/product.server"
import { isAdmin, isCustomer } from "~/lib/session.server"
import { useOptionalUser } from "~/utils/hooks"

export type AppLoaderData = SerializeFrom<typeof loader>
export const loader = async ({ request }: LoaderArgs) => {
  if (await isAdmin(request)) {
    return redirect("/admin")
  }

  const products = await getAllProducts()
  return json({ products, isCustomer: await isCustomer(request) })
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { products } = useLoaderData<typeof loader>()

  const [actions] = React.useState<SpotlightAction[]>(() => {
    const actions = [] as SpotlightAction[]

    products.forEach((product) => {
      actions.push({
        title: product.name,
        icon: <Avatar src={product.image} radius="xl" size="sm" />,
        onTrigger: () => navigate(`/product/${product.slug}`),
      })
    })

    return actions
  })

  return (
    <>
      <SpotlightProvider
        shortcut={["mod + K", "/"]}
        highlightQuery
        searchPlaceholder="Search for products..."
        searchIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
        limit={5}
        actionsWrapperComponent={ActionsWrapper}
        nothingFoundMessage={<Text>Nothing found</Text>}
        actions={actions}
      >
        <div className="flex h-full flex-col">
          <HeaderComponent />
          <ScrollArea classNames={{ root: "flex-1 bg-black" }}>
            <main>
              <Outlet />
            </main>
          </ScrollArea>

          <FooterComponent />
        </div>
      </SpotlightProvider>
    </>
  )
}

const customerActions = [
  {
    key: "0",
    title: "Home",
    href: "/",
  },
  {
    key: "1",
    title: "Orders",
    href: "/order-history",
  },
]

function HeaderComponent() {
  const spotlight = useSpotlight()
  const { user } = useOptionalUser()
  const { itemsInCart } = useCart()

  return (
    <>
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
          {customerActions.map((customerAction) => (
            <div key={customerAction.key}>
              <NavLink
                to={customerAction.href}
                className={({ isActive }) =>
                  `text-lg ${
                    isActive ? "text-white" : "text-zinc-400"
                  } hover:text-white`
                }
              >
                {customerAction.title}
              </NavLink>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <ActionIcon
            title="Search"
            size="lg"
            onClick={() => spotlight.openSpotlight()}
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-white" />
          </ActionIcon>

          <Indicator
            label={itemsInCart.length}
            inline
            size={16}
            disabled={itemsInCart.length <= 0}
            color="red"
            offset={7}
          >
            <Button
              px={8}
              component={Link}
              variant="subtle"
              to="/cart"
              title="Cart"
              color="gray"
            >
              <ShoppingCartIcon className="h-5 w-5 text-white" />
            </Button>
          </Indicator>

          {/* <Menu position="bottom-start" withArrow transition="pop-top-right">
            <Menu.Target>
              <button>
                {user ? (
                  <Avatar color="blue" size="md">
                    {user.name.charAt(0)}
                  </Avatar>
                ) : (
                  <Avatar />
                )}
              </button>
            </Menu.Target>

            <Menu.Dropdown>
              {user ? (
                <>
                  <Menu.Item disabled>
                    <div className="flex flex-col">
                      <p>{user.name}</p>
                      <p className="mt-0.5 text-sm">{user.email}</p>
                    </div>
                  </Menu.Item>
                  <Divider />

                  {isCustomer ? (
                    <Menu.Item
                      icon={<ShoppingBagIcon className="h-4 w-4" />}
                      component={Link}
                      to="/order-history"
                    >
                      Your orders
                    </Menu.Item>
                  ) : null}
                  <Menu.Item
                    icon={<ArrowLeftOnRectangleIcon className="h-4 w-4" />}
                    type="submit"
                    form="logout-form"
                  >
                    Logout
                  </Menu.Item>
                </>
              ) : (
                <>
                  <Menu.Item
                    icon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
                    component={Link}
                    to={`/login?redirectTo=${encodeURIComponent(
                      location.pathname
                    )}`}
                  >
                    Login
                  </Menu.Item>
                  <Menu.Item
                    icon={<UserPlusIcon className="h-4 w-4" />}
                    component={Link}
                    to={`/register?redirectTo=${encodeURIComponent(
                      location.pathname
                    )}`}
                  >
                    Create account
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu> */}
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
                  <Menu.Item component={Link} to="/login">
                    Login
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item component={Link} to="/register">
                    Create account
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
    </>
  )
}

function FooterComponent() {
  return <div className="flex items-center justify-center bg-black"></div>
}

function ActionsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <Group
        position="right"
        px={15}
        py="xs"
        className="border-t border-gray-300"
      >
        <Text size="xs" color="dimmed">
          Search powered by {appConfig.name}
        </Text>
      </Group>
    </div>
  )
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
