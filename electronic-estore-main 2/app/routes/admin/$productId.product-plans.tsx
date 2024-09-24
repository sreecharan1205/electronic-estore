import { PlusIcon } from "@heroicons/react/24/solid"
import { Button, clsx, Modal, NumberInput, TextInput } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import type { ActionFunction, LoaderArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { ObjectId } from "bson"
import * as React from "react"
import { TailwindContainer } from "~/components/TailwindContainer"
import { db } from "~/lib/prisma.server"
import { requireUser } from "~/lib/session.server"
import { ManageProductPlan } from "~/lib/zod.schema"
import { badRequest } from "~/utils/misc.server"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

enum MODE {
  edit,
  add,
}

export const loader = async ({ request, params }: LoaderArgs) => {
  await requireUser(request)

  const productPlans = await db.productPlan.findMany({
    where: {
      productId: params.productId,
    },
  })

  return json({
    productPlans,
  })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof ManageProductPlan>
}

export const action: ActionFunction = async ({ request, params }) => {
  const { productId } = params
  if (!productId) {
    return redirect("/admin")
  }

  const { fields, fieldErrors } = await validateAction(
    request,
    ManageProductPlan
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { planId, name, price, guarantee, maintenance } = fields
  const id = new ObjectId()

  await db.productPlan.upsert({
    where: {
      id: planId || id.toString(),
    },
    update: {
      name,
      price,
      guarantee: Number(guarantee),
      maintenance: Number(maintenance),
      productId,
    },
    create: {
      name,
      price,
      guarantee: Number(guarantee),
      maintenance: Number(maintenance),
      productId,
    },
  })

  return json({
    success: true,
  })
}

export default function ManageProduct() {
  const fetcher = useFetcher<ActionData>()
  const imageUploadFetcher = useFetcher()
  const { productPlans } = useLoaderData<typeof loader>()

  const [productPlanToUpdate, setProductPlanToUpdate] = React.useState<
    typeof productPlans[number] | null
  >(null)
  const [mode, setMode] = React.useState<MODE>(MODE.edit)
  const [isModalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false)
  const isSubmitting = fetcher.state !== "idle"

  React.useEffect(() => {
    if (fetcher.state === "idle") {
      return
    }

    if (fetcher.data?.success) {
      setProductPlanToUpdate(null)
      closeModal()
    }
  }, [closeModal, fetcher.data?.success, fetcher.state])

  React.useEffect(() => {
    if (
      imageUploadFetcher.state !== "idle" &&
      imageUploadFetcher.submission === undefined
    ) {
      return
    }

    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageUploadFetcher.data?.success,
    imageUploadFetcher.state,
    imageUploadFetcher.submission,
  ])

  return (
    <>
      <TailwindContainer className="rounded-md bg-black">
        <div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-200">
                Product Plans
              </h1>
              <p className="mt-2 text-sm text-gray-300">
                A list of all the product plans
              </p>
            </div>
            <div>
              <Button
                loading={isSubmitting}
                loaderPosition="left"
                onClick={() => {
                  setMode(MODE.add)
                  openModal()
                }}
                color="gray"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="ml-2">Add Plan</span>
              </Button>
            </div>
          </div>
          <div className="mt-8 flex flex-col rounded-md border-2 border-white">
            <div className="-my-2 -mx-4 overflow-x-auto p-4 sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-6 md:pl-0"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-6 md:pl-0"
                      >
                        Price
                      </th>
                      <th
                        scope="col"
                        className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-300 sm:table-cell"
                      >
                        Guarantee
                      </th>
                      <th
                        scope="col"
                        className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-300 sm:table-cell"
                      >
                        Maintenance
                      </th>
                      <th
                        scope="col"
                        className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productPlans.map((productPlan) => (
                      <tr key={productPlan.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 md:pl-0">
                          {productPlan.name}
                        </td>

                        <td className="whitespace-nowrap py-4 px-3 text-sm text-white">
                          ${productPlan.price.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap py-4 px-3 text-sm text-white">
                          {productPlan.guarantee}
                        </td>
                        <td className="whitespace-nowrap py-4 px-3 text-sm text-white">
                          {productPlan.maintenance}
                        </td>

                        <td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
                          <div className="flex items-center gap-6">
                            <Button
                              loading={isSubmitting}
                              variant="subtle"
                              loaderPosition="right"
                              onClick={() => {
                                setProductPlanToUpdate(productPlan)
                                setMode(MODE.edit)
                                openModal()
                              }}
                              color="gray"
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Modal
        opened={isModalOpen}
        onClose={() => {
          setProductPlanToUpdate(null)
          closeModal()
        }}
        title={clsx({
          "Edit product": mode === MODE.edit,
          "Add product": mode === MODE.add,
        })}
        centered
        overlayBlur={1}
        overlayOpacity={0.7}
      >
        <fetcher.Form method="post" replace>
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="planId"
              defaultValue={productPlanToUpdate?.id}
            />

            <TextInput
              name="name"
              label="Name"
              defaultValue={productPlanToUpdate?.name}
              error={fetcher.data?.fieldErrors?.name}
              required
            />

            <NumberInput
              name="price"
              label="Price"
              min={0}
              defaultValue={productPlanToUpdate?.price}
              error={fetcher.data?.fieldErrors?.price}
              required
            />

            <NumberInput
              name="guarantee"
              label="Guarantee"
              defaultValue={productPlanToUpdate?.guarantee}
              min={1}
              error={fetcher.data?.fieldErrors?.guarantee}
              required
            />

            <NumberInput
              name="maintenance"
              label="Maintenance"
              defaultValue={productPlanToUpdate?.maintenance}
              min={1}
              error={fetcher.data?.fieldErrors?.maintenance}
              required
            />

            <div className="mt-1 flex items-center justify-end gap-4">
              <Button
                variant="subtle"
                disabled={isSubmitting}
                onClick={() => {
                  setProductPlanToUpdate(null)
                  closeModal()
                }}
                color="red"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loaderPosition="right"
              >
                {mode === MODE.edit ? "Save changes" : "Add product"}
              </Button>
            </div>
          </fieldset>
        </fetcher.Form>
      </Modal>
    </>
  )
}
