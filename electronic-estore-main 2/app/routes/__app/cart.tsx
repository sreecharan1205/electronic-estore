import {
	MinusCircleIcon,
	ShoppingCartIcon,
	TrashIcon,
} from '@heroicons/react/24/solid'
import {
	ActionIcon,
	Anchor,
	Button,
	Input,
	Modal,
	Select,
	Textarea,
} from '@mantine/core'
import {DatePicker, TimeInput} from '@mantine/dates'
import {cleanNotifications, showNotification} from '@mantine/notifications'
import {OrderType, PaymentMethod} from '@prisma/client'
import type {ActionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useFetcher, useLoaderData, useLocation} from '@remix-run/react'
import * as React from 'react'
import ReactInputMask from 'react-input-mask'
import {TailwindContainer} from '~/components/TailwindContainer'
import type {CartItem} from '~/context/CartContext'
import {useCart} from '~/context/CartContext'
import {createOrder} from '~/lib/order.server'
import {db} from '~/lib/prisma.server'
import {getUserId} from '~/lib/session.server'
import {useOptionalUser} from '~/utils/hooks'
import {titleCase} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'

type ActionData = Partial<{
	success: boolean
	message: string
}>

export async function loader() {
	const productPlans = await db.productPlan.findMany({})
	return {
		productPlans,
	}
}

export async function action({request}: ActionArgs) {
	const formData = await request.formData()

	const customerId = await getUserId(request)
	const intent = formData.get('intent')?.toString()

	if (!customerId || !intent) {
		return json({success: false, message: 'Unauthorized'}, {status: 401})
	}

	switch (intent) {
		case 'place-order': {
			const stringifiedProducts = formData.get('products[]')?.toString()
			const amount = formData.get('amount')?.toString()
			const orderType = formData.get('orderType')?.toString()
			const paymentMethod = formData.get('paymentMethod')?.toString()
			const address = formData.get('address')?.toString()
			const pickupDateTime = formData.get('pickupTime')?.toString()

			if (!stringifiedProducts || !amount || !paymentMethod || !orderType) {
				return badRequest<ActionData>({
					success: false,
					message: 'Invalid request body',
				})
			}

			if (orderType === OrderType.DELIVERY && !address) {
				return badRequest<ActionData>({
					success: false,
					message: 'Address is required for delivery',
				})
			}

			if (orderType === OrderType.PICKUP && !pickupDateTime) {
				return badRequest<ActionData>({
					success: false,
					message: 'Pickup time is required for pickup',
				})
			}

			const products = JSON.parse(stringifiedProducts) as Array<CartItem>

			await createOrder({
				customerId,
				products,
				amount: Number(amount),
				paymentMethod: paymentMethod as PaymentMethod,
				orderType: orderType as OrderType,
				address: address || '',
				pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
			})

			return redirect('/order-history/?success=true')
		}
	}
}

export default function Cart() {
	const id = React.useId()
	const location = useLocation()
	const fetcher = useFetcher<ActionData>()

	const {clearCart, itemsInCart, totalPrice} = useCart()
	const {user} = useOptionalUser()

	const [orderType, setOrderType] = React.useState<OrderType>(OrderType.PICKUP)
	const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
		PaymentMethod.CREDIT_CARD
	)
	const [address, setAddress] = React.useState(user?.address ?? '')
	const [pickupDate, setPickupDate] = React.useState<Date | null>(
		new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
	)
	const [pickupTime, setPickupTime] = React.useState<Date | null>(
		new Date(new Date().setHours(16, 0, 0, 0))
	)

	const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
	const [cardNumber, setCardNumber] = React.useState<string>('1234567891234567')
	const [cardExpiry, setCardExpiry] = React.useState<Date | null>(
		new Date('2026-12-31')
	)
	const [cardCvv, setCardCvv] = React.useState<string>('123')
	const [errors, setErrors] = React.useState<{
		cardNumber?: string
		cardExpiry?: string
		cardCvv?: string
	}>({
		cardNumber: '',
		cardExpiry: '',
		cardCvv: '',
	})

	const closePaymentModal = () => setIsPaymentModalOpen(false)
	const showPaymentModal = () => setIsPaymentModalOpen(true)

	const placeOrder = () => {
		setErrors({
			cardNumber: '',
			cardExpiry: '',
			cardCvv: '',
		})

		if (cardNumber.replace(/[_ ]/g, '').length !== 16) {
			setErrors(prevError => ({
				...prevError,
				cardNumber: 'Card number must be 16 digits',
			}))
		}

		if (!cardExpiry) {
			setErrors(prevError => ({
				...prevError,
				cardExpiry: 'Card expiry is required',
			}))
		}

		if (!cardCvv || cardCvv.length !== 3) {
			setErrors(prevError => ({
				...prevError,
				cardCvv: 'Card CVV must be 3 digits',
			}))
		}

		if (Object.values(errors).some(error => error !== '')) {
			return
		}

		const pickupDateTime =
			pickupDate && pickupTime
				? new Date(
						pickupDate.setHours(
							pickupTime.getHours(),
							pickupTime.getMinutes(),
							0,
							0
						)
				  )
				: null
		fetcher.submit(
			{
				'products[]': JSON.stringify(itemsInCart),
				amount: totalPrice.toString(),
				intent: 'place-order',
				orderType,
				paymentMethod,
				address,
				pickupDate: pickupDate?.toISOString() ?? '',
				pickupTime: pickupDateTime?.toISOString() ?? '',
			},
			{
				method: 'post',
				replace: true,
			}
		)
	}

	const isSubmitting = fetcher.state !== 'idle'
	const isDelivery = orderType === OrderType.DELIVERY

	React.useEffect(() => {
		if (fetcher.type !== 'done') {
			return
		}

		cleanNotifications()
		if (!fetcher.data.success) {
			showNotification({
				title: 'Error',
				message: fetcher.data.message,
				icon: <MinusCircleIcon className="h-7 w-7" />,
				color: 'red',
			})
			return
		}
	}, [fetcher.data, fetcher.type])

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-black">
					<TailwindContainer>
						<div className="sm:px-4py-16 py-16 px-4 sm:py-20">
							<div className="flex items-center justify-between">
								<div>
									<h1 className="text-2xl font-extrabold tracking-tight text-gray-100 sm:text-3xl">
										Your cart
									</h1>
									<p className="mt-2 text-sm text-gray-100">
										Products in your cart
									</p>
								</div>

								{itemsInCart.length > 0 ? (
									<div className="space-x-2">
										<Button
											variant="light"
											color="gray"
											onClick={() => clearCart()}
											disabled={isSubmitting}
										>
											<span className="text-red-500">Clear cart</span>
										</Button>

										{user ? (
											<Button
												variant="light"
												loading={isSubmitting}
												onClick={() => showPaymentModal()}
												color="gray"
											>
												<span className="text-black">Make payment</span>
											</Button>
										) : (
											<Button
												variant="light"
												component={Link}
												to={`/login?redirectTo=${encodeURIComponent(
													location.pathname
												)}`}
											>
												Sign in to order
											</Button>
										)}
									</div>
								) : null}
							</div>

							<div className="mt-16">
								<h2 className="sr-only">Current Items in cart</h2>

								<div className="flex flex-col gap-12">
									{itemsInCart.length > 0 ? <CartItems /> : <EmptyState />}
								</div>
							</div>
						</div>
					</TailwindContainer>
				</div>
			</div>

			<Modal
				opened={!!user && isPaymentModalOpen}
				onClose={closePaymentModal}
				title="Payment"
				centered
				overlayBlur={1}
				overlayOpacity={0.7}
			>
				<div className="flex flex-col gap-4">
					<h2 className="text-md text-black">
						<span className="font-semibold">Amount: ${totalPrice}</span>
					</h2>

					<Select
						label="Order type"
						value={orderType}
						clearable={false}
						onChange={e => setOrderType(e as OrderType)}
						data={Object.values(OrderType).map(type => ({
							label: titleCase(type.replace(/_/g, ' ')),
							value: type,
						}))}
					/>

					<Select
						label="Payment method"
						value={paymentMethod}
						clearable={false}
						onChange={e => setPaymentMethod(e as PaymentMethod)}
						data={Object.values(PaymentMethod).map(method => ({
							label: titleCase(method.replace(/_/g, ' ')),
							value: method,
						}))}
					/>

					<Input.Wrapper
						id={id}
						label="Credit card number"
						required
						error={errors.cardNumber}
					>
						<Input
							id={id}
							component={ReactInputMask}
							mask="9999 9999 9999 9999"
							placeholder="XXXX XXXX XXXX XXXX"
							alwaysShowMask={false}
							value={cardNumber}
							onChange={e => setCardNumber(e.target.value)}
						/>
					</Input.Wrapper>

					<div className="flex items-center gap-4">
						<Input.Wrapper
							id={id + 'cvv'}
							label="CVV"
							required
							error={errors.cardCvv}
						>
							<Input
								id={id + 'cvv'}
								name="cvv"
								component={ReactInputMask}
								mask="999"
								placeholder="XXX"
								alwaysShowMask={false}
								value={cardCvv}
								onChange={e => setCardCvv(e.target.value)}
							/>
						</Input.Wrapper>

						<DatePicker
							name="expiryDate"
							label="Expiry"
							inputFormat="MM/YYYY"
							clearable={false}
							placeholder="MM/YYYY"
							labelFormat="MM/YYYY"
							required
							value={cardExpiry}
							minDate={new Date()}
							onChange={e => setCardExpiry(e)}
							error={errors.cardExpiry}
							initialLevel="year"
							hideOutsideDates
						/>
					</div>

					{isDelivery ? (
						<Textarea
							label="Delivery address"
							name="address"
							value={address}
							onChange={e => setAddress(e.target.value)}
							required
						/>
					) : (
						<div className="grid grid-cols-2 gap-4">
							<DatePicker
								label="Pickup date"
								clearable={false}
								minDate={new Date()}
								value={pickupDate}
								onChange={setPickupDate}
								hideOutsideDates
								required
							/>
							<TimeInput
								label="Pickup time"
								clearable={false}
								format="12"
								value={pickupTime}
								onChange={setPickupTime}
								required
							/>
						</div>
					)}

					<div className="mt-6 flex items-center gap-4 sm:justify-end">
						<Button
							variant="subtle"
							color="red"
							onClick={() => closePaymentModal()}
						>
							Cancel
						</Button>

						<Button
							variant="filled"
							onClick={() => placeOrder()}
							loading={isSubmitting}
							loaderPosition="right"
						>
							Place order
						</Button>
					</div>
				</div>
			</Modal>
		</>
	)
}

function CartItems() {
	const {itemsInCart, removeItemFromCart, totalPrice} = useCart()
	const {productPlans} = useLoaderData<typeof loader>()

	return (
		<>
			<table className="mt-4 w-full rounded-md border-2 border-gray-500 text-white sm:mt-6">
				<thead className="sr-only text-left text-sm text-gray-300 sm:not-sr-only">
					<tr>
						<th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
							Products
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Quantity
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Price
						</th>

						<th scope="col" className="w-0 py-3 text-right font-normal" />
					</tr>
				</thead>

				<tbody className="divide-y divide-gray-200 border-b border-gray-200 p-8 text-sm sm:border-t">
					{itemsInCart.map(item => {
						const itemTotalPrice =
							(item.basePrice + (item.planPrice ?? 0)) * item.quantity

						const itemProductPlan = productPlans.find(
							plan => plan.id === item.productPlanId
						)
						return (
							<tr key={item.id}>
								<td className="py-6 pr-8">
									<div className="flex items-center">
										<img
											src={item.image}
											alt={item.name}
											className="mr-6 h-16 w-16 rounded object-cover object-center"
										/>
										<div>
											<div className="flex flex-col font-medium text-white">
												<div>
													<Anchor
														component={Link}
														to={`/product/${item.slug}`}
														size="sm"
													>
														<span className="text-white">{item.name}</span>
													</Anchor>
												</div>
												<div>
													{itemProductPlan && (
														<span className="text-gray-500">
															<b>Plan:</b> {itemProductPlan.name} ($
															{itemProductPlan.price})
														</span>
													)}
												</div>
											</div>
										</div>
									</div>
								</td>

								<td className="hidden py-6 pr-8 sm:table-cell">
									{item.quantity}
								</td>
								<td className="hidden py-6 pr-8 font-semibold sm:table-cell">
									${itemTotalPrice.toFixed(2)}
								</td>

								<td className="hidden py-6 pr-8 sm:table-cell">
									{item.quantity}
								</td>
								<td className="whitespace-nowrap py-6 text-right font-medium">
									<ActionIcon onClick={() => removeItemFromCart(item.id!)}>
										<TrashIcon className="h-4 w-4 text-red-500" />
									</ActionIcon>
								</td>
							</tr>
						)
					})}

					<tr>
						<td className="py-6 pr-8">
							<div className="flex items-center">
								<div>
									<div className="font-medium text-gray-900" />
									<div className="mt-1 sm:hidden" />
								</div>
							</div>
						</td>

						<td className="hidden py-6 pr-8 sm:table-cell" />
						<td className="hidden py-6 pr-8 font-semibold sm:table-cell">
							<span>${totalPrice.toFixed(2)}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</>
	)
}

function EmptyState() {
	return (
		<div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				Your cart is empty
			</span>
		</div>
	)
}
