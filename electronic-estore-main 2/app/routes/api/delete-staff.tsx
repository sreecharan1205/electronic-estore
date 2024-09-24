import type {ActionArgs, LoaderArgs} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {db} from '~/lib/prisma.server'

export const action = async ({request}: ActionArgs) => {
	const formData = await request.formData()

	const id = formData.get('id')?.toString()

	if (!id) {
		return null
	}

	await db.user.delete({where: {id}})
	return null
}

export const loader = async ({request}: LoaderArgs) => {
	return redirect('/')
}
