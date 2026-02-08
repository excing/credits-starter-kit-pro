import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminOverviewStats } from '$lib/server/credits';
import { isAdmin } from '$lib/server/auth-utils';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;
	const userEmail = locals.session?.user?.email;

	if (!userId || !userEmail) {
		return json({ error: '未授权' }, { status: 401 });
	}

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const stats = await getAdminOverviewStats();
		return json(stats);
	} catch (error) {
		console.error('获取概览统计失败:', error);
		return json({ error: '获取统计失败' }, { status: 500 });
	}
};
