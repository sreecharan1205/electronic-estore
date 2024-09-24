import { Anchor, Button } from "@mantine/core"
import { Link } from "@remix-run/react"
import { useAppData } from "~/utils/hooks"

export default function Dashboard() {
  const { products } = useAppData()

  return (
    <div className="bg-black py-24 sm:p-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-semibold leading-7 text-gray-300">
            Products
          </h2>
          <p className="mt-5 text-lg font-bold tracking-tight text-gray-300 sm:text-xl">
            Everything you need is here 👇🏿
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {products.map((product) => {
              return (
                <div key={product.id} className="mx-auto sm:mx-[unset]">
                  <div className="h-48 overflow-hidden rounded-md bg-gray-200 shadow lg:h-64">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  <h3 className="mt-4 text-sm text-white">
                    <Anchor
                      to={`/product/${product.slug}`}
                      prefetch="intent"
                      component={Link}
                    >
                      <span className="text-white">{product.name}</span>
                    </Anchor>
                  </h3>

                  <p className="mt-1 text-sm font-medium text-white">
                    ${product.price}
                  </p>

                  <Button
                    to={`/product/${product.slug}`}
                    component={Link}
                    variant="light"
                    fullWidth
                    mt="md"
                    color="gray"
                  >
                    <span className="text-black">View</span>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
