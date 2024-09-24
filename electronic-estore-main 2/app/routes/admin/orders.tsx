import {
	CheckCircleIcon,
	MinusCircleIcon,
	ShoppingCartIcon,
} from '@heroicons/react/24/solid'
import {ActionIcon, Badge, NativeSelect} from '@mantine/core'
import {OrderStatus, OrderType} from '@prisma/client'
import type {ActionArgs, LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData, useSubmit, useTransition} from '@remix-run/react'
import invariant from 'tiny-invariant'
import {TailwindContainer} from '~/components/TailwindContainer'
import {
	approveReturnRequest,
	getAllOrders,
	rejectReturnRequest,
} from '~/lib/order.server'
import {db} from '~/lib/prisma.server'
import {requireUser} from '~/lib/session.server'
import {titleCase} from '~/utils/misc'

export const loader = async ({request}: LoaderArgs) => {
	await requireUser(request)

	const orders = await getAllOrders()
	return json({orders})
}

export const action = async ({request}: ActionArgs) => {
	const formData = await request.formData()

	const intent = formData.get('intent')?.toString()
	invariant(intent, 'Invalid intent')

	const orderId = formData.get('orderId')?.toString()
	invariant(orderId, 'Invalid order id')

	switch (intent) {
		case 'approve-order': {
			await db.order.update({
				where: {id: orderId},
				data: {status: OrderStatus.ACCEPTED},
			})

			return json({success: true})
		}

		case 'approve-return-request': {
			await approveReturnRequest(orderId)

			return json({success: true})
		}

		case 'reject-return-request': {
			await rejectReturnRequest(orderId)

			return json({success: true})
		}

		case 'reject-order': {
			await db.order.update({
				where: {id: orderId},
				data: {status: OrderStatus.REJECTED},
			})

			return json({success: true})
		}
		case 'update-order-status': {
			const status = formData.get('status')?.toString()
			invariant(status, 'Invalid status')

			await db.order.update({
				where: {id: orderId},
				data: {status: status as OrderStatus},
			})

			return json({success: true})
		}

		default:
			return json({success: false, message: 'Invalid intent'}, {status: 400})
	}
}

export default function Orders() {
	const {orders} = useLoaderData<typeof loader>()
	const transition = useTransition()
	const submit = useSubmit()

	const isSubmitting = transition.state !== 'idle'

	return (
		<>
			<TailwindContainer className="mt-16">
				<div className="px-4 sm:px-6 lg:px-8">
					<div className="sm:flex sm:items-center">
						<div className="sm:flex-auto">
							<h1 className="text-xl font-semibold text-white">Orders</h1>
							<p className="mt-2 text-sm text-gray-100">
								A list of all the orders in your account including their user
								details.
							</p>
						</div>
					</div>
					<div className="mt-8 flex flex-col rounded-md border-2 border-white">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								<div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
									{orders.length > 0 ? (
										<table className="min-w-full divide-y divide-gray-300">
											<thead className="bg-gray-900">
												<tr>
													<th
														scope="col"
														className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6"
													>
														Name
													</th>
													<th
														scope="col"
														className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200"
													>
														Type
													</th>
													<th
														scope="col"
														className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200"
													>
														Status
													</th>
													<th
														scope="col"
														className="relative py-3.5 pl-3 pr-4 text-gray-200 sm:pr-6"
													>
														Update status
														<span className="sr-only">Edit</span>
													</th>
												</tr>
											</thead>
											<tbody className="bg-[rgb(129, 135, 80)] divide-y divide-gray-200">
												{orders.map(order => {
													const isPending = order.status === OrderStatus.PENDING
													const isCancelled =
														order.status === OrderStatus.CANCELLED
													const isRejected =
														order.status === OrderStatus.REJECTED
													const isReturned =
														order.status === OrderStatus.RETURNED
													const isReturnRequested =
														order.status === OrderStatus.RETURN_REQUESTED

													const statusOptions =
														order.type === OrderType.PICKUP
															? ['PREPARING', 'READY']
															: ['PREPARING', 'DELIVERED']

													const isOrderReady =
														order.status === OrderStatus.READY
													const isOrderDelivered =
														order.status === OrderStatus.DELIVERED

													return (
														<tr key={order.id}>
															<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
																<div className="flex items-center">
																	<div className="ml-4">
																		<div className="font-medium text-gray-300">
																			{order.customer.name}
																		</div>
																		<div className="text-gray-300">
																			{order.customer.email}
																		</div>
																	</div>
																</div>
															</td>

															<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
																<div className="text-gray-300">
																	{titleCase(order.type)}
																</div>
																<div className="text-gray-300">
																	(
																	{titleCase(
																		order.payment?.paymentMethod ?? ''
																	)}
																	)
																</div>
															</td>
															<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
																<Badge
																	color={
																		isReturned
																			? 'yellow'
																			: isPending
																			? 'gray'
																			: isCancelled
																			? 'indigo'
																			: isRejected
																			? 'red'
																			: 'green'
																	}
																>
																	{titleCase(order.status)}
																</Badge>
															</td>
															<td className="relative flex items-center justify-center whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6">
																<div className="flex items-center gap-2">
																	{isPending ? (
																		<>
																			<ActionIcon
																				color="green"
																				disabled={isSubmitting || !isPending}
																				onClick={() =>
																					submit(
																						{
																							intent: 'approve-order',
																							orderId: order.id,
																						},
																						{
																							method: 'post',
																							replace: true,
																						}
																					)
																				}
																			>
																				<CheckCircleIcon className="h-6" />
																			</ActionIcon>
																			<ActionIcon
																				color="red"
																				type="submit"
																				name="intent"
																				value="reject-order"
																				disabled={isSubmitting || !isPending}
																				onClick={() => {
																					submit(
																						{
																							intent: 'reject-order',
																							orderId: order.id,
																						},
																						{
																							method: 'post',
																							replace: true,
																						}
																					)
																				}}
																			>
																				<MinusCircleIcon className="h-7" />
																			</ActionIcon>
																		</>
																	) : isReturnRequested ? (
																		<>
																			<ActionIcon
																				color="green"
																				disabled={isSubmitting}
																				onClick={() =>
																					submit(
																						{
																							intent: 'approve-return-request',
																							orderId: order.id,
																						},
																						{
																							method: 'post',
																							replace: true,
																						}
																					)
																				}
																			>
																				<CheckCircleIcon className="h-6" />
																			</ActionIcon>
																			<ActionIcon
																				color="red"
																				disabled={isSubmitting}
																				onClick={() => {
																					submit(
																						{
																							intent: 'reject-return-request',
																							orderId: order.id,
																						},
																						{
																							method: 'post',
																							replace: true,
																						}
																					)
																				}}
																			>
																				<MinusCircleIcon className="h-7" />
																			</ActionIcon>
																		</>
																	) : !isRejected && !isReturned ? (
																		<>
																			<NativeSelect
																				className="w-48"
																				defaultValue={order.status}
																				data={statusOptions}
																				disabled={
																					isSubmitting ||
																					isOrderReady ||
																					isOrderDelivered
																				}
																				onChange={e => {
																					submit(
																						{
																							intent: 'update-order-status',
																							orderId: order.id,
																							status: e.target.value,
																						},
																						{
																							method: 'post',
																							replace: true,
																						}
																					)
																				}}
																			/>
																		</>
																	) : null}
																</div>
															</td>
														</tr>
													)
												})}
											</tbody>
										</table>
									) : (
										<div className="bg-[rgb(129, 135, 80)] relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
											<ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-300" />
											<span className="mt-4 block text-sm font-medium text-gray-300">
												No orders placed yet. <br />
												Come back later.
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>
		</>
	)
}
