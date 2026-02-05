import type { LayoutServerLoad } from './$types';
import { isAdmin } from '$lib/server/auth-utils';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userEmail = locals.session?.user?.email;

	return {
		isAdmin: isAdmin(userEmail)
	};
};
