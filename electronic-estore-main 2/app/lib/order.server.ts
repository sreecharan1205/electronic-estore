import type {
	Order,
	OrderType,
	Payment,
	PaymentMethod,
	Product,
	ProductOrder,
	User,
} from '@prisma/client'
import {OrderStatus} from '@prisma/client'
import type {CartItem} from '~/context/CartContext'
import {db} from './prisma.server'

export function getAllOrders() {
	return db.order.findMany({
		orderBy: {createdAt: 'desc'},
		include: {
			customer: true,
			payment: true,
			products: {
				include: {
					product: true,
				},
			},
		},
	})
}

export function getOrders(customerId: User['id']) {
	return db.order.findMany({
		where: {
			customerId,
		},
		orderBy: {
			createdAt: 'desc',
		},
		include: {
			customer: true,
			products: {
				include: {
					product: true,
				},
			},
			payment: true,
		},
	})
}

export function createOrder({
	customerId,
	products,
	amount,
	orderType,
	paymentMethod,
	address,
	pickupDateTime,
}: {
	customerId: User['id']
	products: Array<CartItem>
	amount: Payment['amount']
	paymentMethod: PaymentMethod
	orderType: OrderType
	address: Required<Payment['address']>
	pickupDateTime: Order['pickupDateTime']
}) {
	return db.$transaction(async tx => {
		const order = await tx.order.create({
			data: {
				customerId,
				type: orderType,
				status: OrderStatus.PENDING,
				pickupDateTime,
				payment: {
					create: {
						paymentMethod,
						address,
						amount,
						customer: {
							connect: {
								id: customerId,
							},
						},
					},
				},
			},
		})

		let productsWithSerialNumber: Array<{
			productId: Product['id']
			orderId: Order['id']
			quantity: number
			serialNo: ProductOrder['serialNo']
			amount: Product['price']
			productPlanId?: ProductOrder['productPlanId']
		}> = []

		products.forEach(p => {
			productsWithSerialNumber.push({
				productId: p.id,
				orderId: order.id,
				quantity: p.quantity,
				serialNo: p.serialNo,
				amount: p.basePrice,
				productPlanId: p.productPlanId,
			})
		})

		await tx.productOrder.createMany({
			data: productsWithSerialNumber,
		})

		await Promise.all(
			products.map(async p => {
				const product = await tx.product.update({
					where: {
						id: p.id,
					},
					data: {
						quantity: {
							decrement: p.quantity,
						},
					},
				})

				if (product.quantity < 0) {
					throw new Error(`Product ${product.name} has insufficient quantity`)
				}
			})
		)

		return order
	})
}

export async function returnOrder(orderId: Order['id']) {
	const order = await db.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			products: {
				include: {
					product: true,
				},
			},
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	await db.productOrder.updateMany({
		where: {
			orderId,
		},
		data: {
			returnRequested: true,
		},
	})

	await db.order.update({
		where: {
			id: orderId,
		},
		data: {
			status: OrderStatus.RETURN_REQUESTED,
		},
	})

	const productUpdates = order.products.map(productOrder =>
		db.product.update({
			where: {
				id: productOrder.product.id,
			},
			data: {
				quantity: {
					increment: productOrder.quantity,
				},
			},
		})
	)

	await Promise.all(productUpdates)
}

export async function approveReturnRequest(orderId: Order['id']) {
	const order = await db.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			products: {
				include: {
					product: true,
				},
			},
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	await db.productOrder.updateMany({
		where: {
			orderId,
		},
		data: {
			returnRequested: true,
			isReturned: true,
			amount: 0,
			quantity: 0,
		},
	})

	await db.order.update({
		where: {
			id: orderId,
		},
		data: {
			status: OrderStatus.RETURNED,
			payment: {
				update: {
					amount: 0,
				},
			},
		},
	})

	const productUpdates = order.products.map(productOrder =>
		db.product.update({
			where: {
				id: productOrder.product.id,
			},
			data: {
				quantity: {
					increment: productOrder.quantity,
				},
			},
		})
	)

	await Promise.all(productUpdates)
}

export async function rejectReturnRequest(orderId: Order['id']) {
	const order = await db.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			products: {
				include: {
					product: true,
				},
			},
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	await db.order.update({
		where: {
			id: orderId,
		},
		data: {
			status: OrderStatus.RETURN_REJECTED,
			payment: {
				update: {
					amount: 0,
				},
			},
		},
	})
}

export async function returnItem(
	orderId: Order['id'],
	productOrderId: ProductOrder['id'],
	userId: User['id']
) {
	const order = await db.order.findUnique({
		where: {
			id: orderId,
			customerId: userId,
		},
		include: {
			products: true,
			payment: true,
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	if (!order.payment) {
		throw new Error('Order payment not found')
	}

	const productOrder = order.products.find(
		productOrder => productOrder.id === productOrderId
	)

	if (!productOrder) {
		throw new Error('Product order not found')
	}

	if (productOrder.isReturned) {
		throw new Error('Item is already returned')
	}

	await db.productOrder.update({
		where: {
			id: productOrderId,
		},
		data: {
			isReturned: true,
		},
	})

	const newAmount = order.payment.amount - productOrder.amount

	await db.order.update({
		where: {
			id: orderId,
		},
		data: {
			payment: {
				update: {
					amount: newAmount,
				},
			},
		},
	})

	await db.product.update({
		where: {
			id: productOrder.productId,
		},
		data: {
			quantity: {
				increment: productOrder.quantity,
			},
		},
	})

	const updatedOrder = await db.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			products: true,
		},
	})

	if (!updatedOrder) {
		throw new Error('Order not found after update')
	}

	const allItemsReturned = updatedOrder.products.every(
		productOrder => productOrder.isReturned
	)

	if (allItemsReturned) {
		await db.order.update({
			where: {
				id: orderId,
			},
			data: {
				status: OrderStatus.RETURNED,
			},
		})
	}
}
