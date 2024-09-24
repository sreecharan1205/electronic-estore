import { db } from "./prisma.server"

export function getAllProducts() {
  return db.product.findMany({
    include: {
      productPlans: true,
      categories: {
        select: {
          category: true,
        },
      },
    },
  })
}
