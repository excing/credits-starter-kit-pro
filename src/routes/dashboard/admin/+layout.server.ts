import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { isAdmin } = await parent();

	// 如果不是管理员，重定向到 dashboard 首页
	if (!isAdmin) {
		throw redirect(302, '/dashboard');
	}

	return {};
};
