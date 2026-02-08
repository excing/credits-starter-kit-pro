/**
 * 管理员控制台概览聚合 API
 * GET /api/admin/credits/overview
 *
 * 仅返回统计数据和汇总计数（轻量级），不返回具体的套餐/兑换码/欠费数据。
 * 各子页面进入时自行加载所需的具体数据。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminOverviewStats, getAdminOverviewCounts } from '$lib/server/credits';
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
		const [stats, counts] = await Promise.all([
			getAdminOverviewStats(),
			getAdminOverviewCounts()
		]);

		return json({ stats, counts });
	} catch (error) {
		console.error('获取管理员概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
