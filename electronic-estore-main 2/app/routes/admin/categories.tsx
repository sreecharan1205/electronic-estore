import { Button, Modal, TextInput, clsx } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import type { ActionFunction, LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { ObjectId } from "bson"
import { PlusIcon } from "lucide-react"
import * as React from "react"
import { z } from "zod"
import { TailwindContainer } from "~/components/TailwindContainer"
import { db } from "~/lib/prisma.server"
import { badRequest } from "~/utils/misc.server"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

export const loader = async ({ request }: LoaderArgs) => {
  const categories = await db.category.findMany({})

  return json({ categories })
}

enum MODE {
  edit,
  add,
}

const ManageCategorySchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
})

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof ManageCategorySchema>
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(
    request,
    ManageCategorySchema
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { categoryId, ...rest } = fields
  const id = new ObjectId()

  await db.category.upsert({
    where: {
      id: categoryId || id.toString(),
    },
    update: { ...rest },
    create: {
      name: rest.name,
    },
  })
  return json({ success: true })
}

export default function ManageFoodItems() {
  const fetcher = useFetcher<ActionData>()
  const { categories } = useLoaderData<typeof loader>()

  type _Category = typeof categories[number]

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<
    _Category["id"] | null
  >(null)
  const [selectedCategory, setSelectedCategory] =
    React.useState<_Category | null>(null)
  const [mode, setMode] = React.useState<MODE>(MODE.edit)
  const [isModalOpen, handleModal] = useDisclosure(false)

  const isSubmitting = fetcher.state !== "idle"

  React.useEffect(() => {
    if (fetcher.state !== "idle" && fetcher.submission === undefined) {
      return
    }

    if (fetcher.data?.success) {
      setSelectedCategoryId(null)
      handleModal.close()
    }
    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data?.success, fetcher.state, fetcher.submission])

  React.useEffect(() => {
    if (!selectedCategoryId) {
      setSelectedCategory(null)
      return
    }

    const category = categories.find(
      (category) => category.id === selectedCategoryId
    )
    if (!category) return

    setSelectedCategory(category)
    handleModal.open()
    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, selectedCategoryId])

  return (
    <>
      <TailwindContainer className="lg:max-w-full">
        <div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-200">
                Manage Categories
              </h1>
            </div>
            <div>
              <Button
                loading={isSubmitting}
                loaderPosition="left"
                onClick={() => {
                  handleModal.open()
                  setMode(MODE.add)
                }}
                color="gray"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="ml-2">Add Category</span>
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
                        className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 md:pl-0">
                          {category.name}
                        </td>

                        <td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
                          <div className="flex items-center gap-6">
                            <Button
                              loading={isSubmitting}
                              variant="subtle"
                              loaderPosition="right"
                              onClick={() => {
                                setSelectedCategoryId(category.id)
                                setMode(MODE.edit)
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
          setSelectedCategoryId(null)
          handleModal.close()
        }}
        title={clsx({
          "Edit Category": mode === MODE.edit,
          "Add Category": mode === MODE.add,
        })}
        centered
        overlayBlur={1.2}
        overlayOpacity={0.6}
      >
        <fetcher.Form method="post" replace>
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
            <input
              hidden
              name="categoryId"
              defaultValue={selectedCategory?.id}
            />
            <TextInput
              name="name"
              label="Name"
              defaultValue={selectedCategory?.name}
              error={fetcher.data?.fieldErrors?.name}
              required
            />
            <div className="mt-1 flex items-center justify-end gap-4">
              <Button
                variant="subtle"
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedCategory(null)
                  handleModal.close()
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
                {mode === MODE.edit ? "Save changes" : "Add Category"}
              </Button>
            </div>
          </fieldset>
        </fetcher.Form>
      </Modal>
    </>
  )
}
