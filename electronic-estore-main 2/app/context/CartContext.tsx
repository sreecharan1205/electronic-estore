import {CheckCircleIcon, MinusCircleIcon} from '@heroicons/react/24/solid'
import {cleanNotifications, showNotification} from '@mantine/notifications'
import type {Product} from '@prisma/client'
import * as React from 'react'
import {useLocalStorageState} from '~/utils/hooks'
import type {DateToString} from '~/utils/types'

const LocalStorageKey = 'eStore-application'

export type CartItem = DateToString<Product> & {
	basePrice: number
	productPlanId?: string
	planPrice?: number
	serialNo: string
}

interface ICartContext {
	itemsInCart: Array<CartItem>
	addItemToCart: (item: CartItem) => void
	removeItemFromCart: (itemId: CartItem['id']) => void
	clearCart: () => void
	totalPrice: number
}

const CartContext = React.createContext<ICartContext | undefined>(undefined)

export function CartProvider({children}: {children: React.ReactNode}) {
	const [items, setItems] = useLocalStorageState<CartItem[]>({
		key: LocalStorageKey,
		defaultValue: [],
	})

	const totalPrice = items.reduce((acc, item) => {
		return acc + (item.basePrice + (item.planPrice ?? 0)) * item.quantity
	}, 0)

	const clearCart = React.useCallback(() => {
		cleanNotifications()
		setItems([])
		showNotification({
			title: 'Successfully cleared',
			message: 'All items in the cart are cleared',
			icon: <CheckCircleIcon className="h-7 w-7" />,
			color: 'green',
		})
	}, [setItems])

	const addItemToCart = React.useCallback(
		(item: CartItem) => {
			const isAlreadyInCart = items.some(
				cartItem =>
					cartItem.id === item.id &&
					cartItem.productPlanId === item.productPlanId
			)

			if (isAlreadyInCart) {
				// increase quantity
				setItems(prevItems => {
					const newItems = prevItems.map(cartItem => {
						if (
							cartItem.id === item.id &&
							cartItem.productPlanId === item.productPlanId
						) {
							return {
								...cartItem,
								quantity: cartItem.quantity + item.quantity,
							}
						}
						return cartItem
					})
					cleanNotifications()
					showNotification({
						title: 'Item added to cart',
						message: `Added ${item.name} to your cart.`,
						icon: <CheckCircleIcon className="h-7 w-7" />,
						color: 'green',
					})
					return newItems
				})
			} else {
				setItems(prevItems => {
					const newItems = [...prevItems, {...item, quantity: item.quantity}]
					cleanNotifications()
					showNotification({
						title: 'Item added to cart',
						message: `Added ${item.name} to your cart.`,
						icon: <CheckCircleIcon className="h-7 w-7" />,
						color: 'green',
					})
					return newItems
				})
			}
		},
		[items, setItems]
	)

	const removeItemFromCart = (itemId: CartItem['id']) => {
		setItems(prev => prev.filter(item => item.id !== itemId))

		showNotification({
			title: 'Successfully removed',
			message: 'Item removed from cart',
			icon: <MinusCircleIcon className="h-7 w-7" />,
			color: 'red',
		})
	}

	return (
		<CartContext.Provider
			value={{
				itemsInCart: items,
				totalPrice,
				addItemToCart,
				removeItemFromCart,
				clearCart,
			}}
		>
			{children}
		</CartContext.Provider>
	)
}

export function useCart() {
	const context = React.useContext(CartContext)
	if (!context) {
		throw new Error('`useCart()` must be used within a <CartProvider />')
	}

	return context
}
