import {ShoppingBagIcon} from '@heroicons/react/24/outline'
import {Anchor, Badge, Button} from '@mantine/core'
import {OrderStatus, OrderType} from '@prisma/client'
import type {ActionArgs, LoaderArgs, SerializeFrom} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import clsx from 'clsx'
import * as React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {useCart} from '~/context/CartContext'
import {getOrders, returnItem, returnOrder} from '~/lib/order.server'
import {db} from '~/lib/prisma.server'
import {requireUserId} from '~/lib/session.server'
import {formatDate, titleCase} from '~/utils/misc'

const dateFormatter = new Intl.DateTimeFormat('en-US')

type LoaderData = SerializeFrom<typeof loader>
export const loader = async ({request}: LoaderArgs) => {
	const userId = await requireUserId(request)
	const orders = await getOrders(userId)
	const productPlans = await db.productPlan.findMany({})
	return json({orders, productPlans})
}

export const action = async ({request}: ActionArgs) => {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const intent = formData.get('intent')?.toString()
	if (!userId || !intent) {
		return json({success: false, message: 'Unauthorized'}, {status: 401})
	}

	switch (intent) {
		case 'return-order': {
			const orderId = formData.get('orderId')?.toString()

			if (!orderId) {
				return json(
					{success: false, message: 'Invalid order id or product id'},
					{status: 400}
				)
			}

			return returnOrder(orderId)
				.then(() => json({success: true}))
				.catch(e => json({success: false, message: e.message}, {status: 500}))
		}

		case 'return-item': {
			const orderId = formData.get('orderId')?.toString()
			const productOrderId = formData.get('productOrderId')?.toString()
			if (!orderId || !productOrderId) {
				return json(
					{
						success: false,
						message: 'Order ID or Product Order ID is missing',
					},
					{status: 400}
				)
			}

			return returnItem(orderId, productOrderId, userId)
				.then(() => json({success: true}))
				.catch(e => json({success: false, message: e.message}, {status: 500}))
		}

		default:
			return json({success: false, message: 'Invalid intent'}, {status: 400})
	}
}

export default function OrderHistory() {
	const {orders} = useLoaderData<typeof loader>()

	const [searchParams, setSearchParams] = useSearchParams()
	const {clearCart} = useCart()

	React.useEffect(() => {
		const success = searchParams.get('success')
		if (success) {
			clearCart()
			setSearchParams({}, {replace: true})
			return
		}
	}, [clearCart, searchParams, setSearchParams])

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-black">
					<TailwindContainer>
						<div className="py-16 px-4 sm:py-20 sm:px-4">
							<div className="max-w-xl">
								<h1 className="text-2xl font-extrabold tracking-tight text-gray-300 sm:text-3xl">
									Order history
								</h1>
								<p className="mt-2 text-sm text-gray-300">
									Check the status of recent orders.
								</p>
							</div>

							<div className="mt-16">
								<h2 className="sr-only">Recent orders</h2>

								<div className="flex flex-col gap-20">
									{orders.length > 0 ? (
										<>
											{orders.map(order => (
												<Order order={order} key={order.id} />
											))}
										</>
									) : (
										<EmptyState />
									)}
								</div>
							</div>
						</div>
					</TailwindContainer>
				</div>
			</div>
		</>
	)
}

function Order({order}: {order: LoaderData['orders'][number]}) {
	const {productPlans} = useLoaderData<typeof loader>()
	const returnOrderFetcher = useFetcher()

	const isOrderReturned = order.status === OrderStatus.RETURNED
	const isDelivery = order.type === OrderType.DELIVERY

	return (
		<div key={order.id}>
			<h3 className="sr-only">
				Order placed on{' '}
				<time dateTime={order.createdAt}>{order.createdAt}</time>
			</h3>

			<div
				className={clsx(
					'rounded-lg bg-gray-800 py-6 px-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:gap-8'
				)}
			>
				<dl className="flex-auto space-y-6 divide-y divide-gray-200 text-sm text-gray-600  sm:flex sm:items-center sm:gap-6 sm:space-y-0 sm:divide-y-0 lg:flex-none lg:gap-16">
					{/* Date placed */}
					<div className="flex justify-between sm:block">
						<dt className="font-semibold text-gray-200">Date placed</dt>
						<dd className="sm:mt-1">
							<time dateTime={order.createdAt}>
								<span className="text-gray-300">
									{dateFormatter.format(new Date(order.createdAt))}
								</span>
							</time>
						</dd>
					</div>

					{/* Order type */}
					<div className="flex justify-between pt-6 text-gray-200 sm:block sm:pt-0">
						<dt className="font-semibold">Order type</dt>
						<dd className="text-gray-300 sm:mt-1">{titleCase(order.type)}</dd>
					</div>

					{/* Payment method */}
					<div className="flex justify-between pt-6 text-gray-200 sm:block sm:pt-0">
						<dt className="font-semibold">Payment method</dt>
						<dd className="text-gray-300 sm:mt-1">
							{titleCase(order.payment!.paymentMethod.replace(/_/g, ' '))}
						</dd>
					</div>

					{/* Total amount */}
					<div className="flex justify-between pt-6  text-gray-200 sm:block sm:pt-0">
						<dt className="font-semibold">Total amount</dt>
						<dd className="flex items-center gap-2 sm:mt-1">
							<span className="font-semibold text-gray-300">
								${order.payment?.amount}
							</span>
						</dd>
					</div>

					{/* Status */}
					<div className="flex justify-between pt-6  text-gray-200 sm:block sm:pt-0">
						<dt className="font-semibold">Status</dt>
						<dd className="flex items-center gap-2 text-gray-300 sm:mt-1">
							<Badge color={isOrderReturned ? 'blue' : 'green'}>
								{titleCase(order.status)}
							</Badge>
						</dd>
					</div>
				</dl>

				{order.status === OrderStatus.DELIVERED ||
				order.status === OrderStatus.READY ||
				order.status === OrderStatus.COMPLETED ? (
					<Button
						color="red"
						variant="outline"
						loaderPosition="right"
						loading={returnOrderFetcher.state !== 'idle'}
						onClick={() =>
							returnOrderFetcher.submit(
								{
									intent: 'return-order',
									orderId: order.id,
								},
								{method: 'post', replace: true}
							)
						}
					>
						Return Order
					</Button>
				) : null}
			</div>

			{/* Delivery address  */}
			{isDelivery ? (
				<div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-200 sm:block sm:pt-0">
					<span className="pl-6 font-semibold text-gray-300">
						Delivery address:{' '}
					</span>
					<span className="font-normal text-gray-300">
						{order.payment?.address}
					</span>
				</div>
			) : order.status === OrderStatus.READY ? (
				<div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-200 sm:block sm:pt-0">
					<span className="pl-6 font-semibold text-gray-300">Pickup: </span>
					<span className="font-normal text-gray-300">
						{formatDate(order.pickupDateTime!)}
					</span>
				</div>
			) : null}

			<table className="mt-4 w-full p-8 text-gray-300 sm:mt-6">
				<thead className="sr-only text-left text-sm text-gray-300 sm:not-sr-only">
					<tr>
						<th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
							Product
						</th>
						<th
							scope="col"
							className="hidden w-1/5 py-3 pr-8 font-normal sm:table-cell"
						>
							Quantity
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Price
						</th>
						<th scope="col" className="w-0 py-3 text-right font-normal"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 border-b border-gray-200 text-sm sm:border-t">
					{order.products.map(productOrder => {
						const productPlan = productPlans.find(
							p => p.id === productOrder.productPlanId
						)

						return (
							<tr key={productOrder.id}>
								<td className="py-6 pr-8">
									<div className="flex items-center">
										<img
											src={productOrder.product.image}
											alt={productOrder.product.name}
											className="mr-6 h-16 w-16 rounded object-cover object-center"
										/>
										<div
											className={clsx('text-gray-300', {
												'line-through': productOrder.isReturned,
											})}
										>
											<p>{productOrder.product.name}</p>
											{productPlan ? (
												<p>
													<b>Plan:</b> {productPlan.name} (${productPlan.price})
												</p>
											) : null}

											{order.status === OrderStatus.DELIVERED ||
											order.status === OrderStatus.READY ||
											order.status === OrderStatus.COMPLETED ? (
												<>
													<span>Serial No: </span>
													<span className="font-medium uppercase">
														{productOrder.serialNo.slice(-12)}
													</span>
												</>
											) : null}
										</div>
									</div>
								</td>

								<td className="hidden py-6 pr-8 text-gray-300 sm:table-cell">
									{productOrder.quantity}
								</td>

								<td className="hidden py-6 pr-8 text-gray-300 sm:table-cell">
									{productOrder.isReturned
										? '$0.00'
										: `$${productOrder.amount}`}
								</td>

								<td className="mr-4 flex items-center justify-center gap-4 whitespace-nowrap py-8 font-medium">
									{!productOrder.isReturned &&
										!productOrder.returnRequested && (
											<Button
												color="red"
												size="xs"
												variant="subtle"
												onClick={() => {
													returnOrderFetcher.submit(
														{
															intent: 'return-item',
															orderId: order.id,
															productOrderId: productOrder.id,
														},
														{method: 'post', replace: true}
													)
												}}
											>
												Return
											</Button>
										)}
									{productOrder.isReturned && (
										<span className="italic text-gray-500">Returned</span>
									)}

									<Anchor
										component={Link}
										to={`/product/${productOrder.product.slug}`}
										size="sm"
										color="gray"
									>
										View
										<span className="sr-only">
											, {productOrder.product.name}
										</span>
									</Anchor>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingBagIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				No previous orders
			</span>
		</div>
	)
}
