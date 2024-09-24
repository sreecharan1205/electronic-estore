import {PrismaClient, Role} from '@prisma/client'
import slugify from 'slugify'
import {createPasswordHash} from '~/utils/misc.server'

const db = new PrismaClient()

async function seed() {
	await db.category.deleteMany()
	await db.productPlan.deleteMany()
	await db.product.deleteMany()
	await db.user.deleteMany()
	await db.admin.deleteMany()

	await db.user.createMany({
		data: [
			{
				name: 'John Doe',
				email: 'customer@app.com',
				password: await createPasswordHash('password'),
				address: '123 Main St',
				role: Role.CUSTOMER,
			},
			{
				name: 'Jane Doe',
				email: 'admin@app.com',
				password: await createPasswordHash('password'),
				address: '123 Main St',
				role: Role.ADMIN,
			},
		],
	})

	await db.admin.create({
		data: {
			name: 'Roxanna',
			email: 'admin@app.com',
			password: await createPasswordHash('password'),
		},
	})

	await db.category.createMany({
		data: [
			{
				name: 'Electronics',
			},
			{
				name: 'Computers',
			},
			{
				name: 'Mobile Phones',
			},
			{
				name: 'TVs and Home Theater',
			},
			{
				name: 'Audio',
			},
			{
				name: 'Cameras and Photography',
			},
			{
				name: 'Drones and Tech Toys',
			},
			{
				name: 'Video Games',
			},
			{
				name: 'Wearable Technology',
			},
			{
				name: 'Networking and WiFi',
			},
			{
				name: 'Batteries and Power',
			},
			{
				name: 'Smart Home',
			},
		],
	})

	for (const product of products) {
		await db.product.create({
			data: {
				name: product.name,
				description: product.description,
				price: product.price,
				image: product.image,
				serialNo: product.serialNo,
				slug: slugify(product.name, {lower: true}),
				quantity: product.quantity,
				vendor: product.vendor,
				productPlans: {
					create: {
						name: 'Basic',
						price: Number(50),
						guarantee: product.productPlan.guarantee,
						maintenance: product.productPlan.maintenance,
					},
				},
			},
		})
	}

	console.log(`Database has been seeded. 🌱`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await db.$disconnect()
	})

const products = [
	{
		name: 'Samsung T5 1TB Portable SSD',
		description:
			'Ultra-fast SSD with USB 3.1 Gen 2 interface. Up to 540 MB/s read and 515 MB/s write speeds. Shock-resistant and compact.',
		image:
			'https://images.unsplash.com/photo-1628557118391-56cd62c9f2cb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=765&q=80',
		quantity: 10,
		price: 109.99,
		vendor: 'Samsung',
		serialNo: '123456789',
		productPlan: {
			guarantee: 5,
			maintenance: 5,
		},
	},
	{
		name: 'Samsung T7 1TB Portable SSD',
		description:
			'Eraser with a rubber grip for comfort and control. Can be used to erase pencil marks.',
		image:
			'https://images.unsplash.com/photo-1640872005860-8a21cb5b05be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
		quantity: 50,
		price: 149.99,
		vendor: 'Samsung',
		serialNo: '123456789',
		productPlan: {
			guarantee: 5,
			maintenance: 5,
		},
	},
]
