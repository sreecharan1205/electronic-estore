import {Button, NumberInput, Select} from '@mantine/core'
import type {LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {useCart} from '~/context/CartContext'
import {db} from '~/lib/prisma.server'

export const loader = async ({params}: LoaderArgs) => {
	const {slug} = params

	const product = await db.product.findUnique({
		where: {slug},
		include: {productPlans: true},
	})

	if (!product) {
		return redirect('/products')
	}

	return json({product})
}

export default function Item() {
	const {product} = useLoaderData<typeof loader>()

	const {addItemToCart} = useCart()

	const [quantity, setQuantity] = React.useState<number>(1)
	const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
		null
	)

	const selectedPlanPrice =
		product.productPlans.find(plan => plan.id === selectedPlanId)?.price ?? 0

	const isOutOfStock = product.quantity === 0
	const totalPrice = quantity
		? (product.price + selectedPlanPrice) * quantity
		: product.price

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-black">
					<div className="mx-auto max-w-2xl py-16 px-4 sm:py-24 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-12 lg:px-8">
						<div className="sm:mt-10 lg:row-span-2 lg:mt-0 lg:self-center">
							<div className="overflow-hidden rounded-lg shadow">
								<img
									src={product.image}
									alt={product.name}
									className="aspect-square w-full object-cover"
								/>
							</div>
						</div>

						<div className="lg:col-start-2 lg:max-w-lg lg:self-end">
							<div className="mt-4">
								<h1 className="text-3xl font-extrabold tracking-tight text-gray-300 sm:text-4xl">
									{product.name}
								</h1>
							</div>

							<section aria-labelledby="information-heading" className="mt-4">
								<p className="text-lg text-gray-300 sm:text-xl">
									${totalPrice}
								</p>
								<div className="mt-4 space-y-6">
									<p className="text-base text-gray-300">
										{product.description}
									</p>
								</div>
								<div className="mt-4">
									<div className="space-y-6">
										<span className="text-gray-300">Vendor: </span>{' '}
										<span className="text-base text-white">
											{product.vendor}
										</span>
									</div>
								</div>

								{!isOutOfStock ? (
									<NumberInput
										mt={12}
										label="Quantity"
										value={quantity}
										max={product.quantity}
										onChange={val => setQuantity(Number(val))}
										min={1}
										defaultValue={1}
										styles={{
											label: {
												color: 'white',
											},
										}}
									/>
								) : null}

								<div className="mt-4 text-white">
									<Select
										label="Plan"
										placeholder="Select a plan"
										data={product.productPlans.map(plan => ({
											value: plan.id,
											label: `${plan.name} (+$${plan.price}) "Guarantee-${plan.guarantee}years"  "Maintenance-${plan.maintenance}years"`,
										}))}
										value={selectedPlanId}
										onChange={value => setSelectedPlanId(value)}
										styles={{
											label: {
												color: 'white',
											},
										}}
									/>
								</div>
							</section>
						</div>

						{/* Add to cart button */}
						<div className="mt-6 lg:col-start-2 lg:row-start-2 lg:max-w-lg lg:self-start">
							<Button
								fullWidth
								mt="2.5rem"
								disabled={
									!quantity || isOutOfStock || quantity > product.quantity
								}
								onClick={() =>
									addItemToCart({
										...product,
										quantity,
										basePrice: product.price,
										productPlanId: selectedPlanId ?? undefined,
										planPrice: selectedPlanPrice,
										serialNo: product.serialNo!,
									})
								}
								color="gray"
							>
								{isOutOfStock ? 'Out of stock' : 'Add to cart'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
