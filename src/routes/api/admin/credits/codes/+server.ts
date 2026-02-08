import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRedemptionCodes } from '$lib/server/credits';
import { isAdmin } from '$lib/server/auth-utils';

export const GET: RequestHandler = async ({ locals, url }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const { codes, total } = await getRedemptionCodes(limit, offset);

		return json({ codes, total, limit, offset });
	} catch (error) {
		console.error('获取兑换码列表失败:', error);
		return json({ error: '获取失败' }, { status: 500 });
	}
};
