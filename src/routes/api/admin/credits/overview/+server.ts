/**
 * 管理员控制台概览聚合 API
 * GET /api/admin/credits/overview
 *
 * 将以下 4 个请求合并为 1 个（仅用于页面初始加载）：
 * - /api/admin/credits/packages (套餐列表)
 * - /api/admin/credits/codes (兑换码，固定首页)
 * - /api/admin/credits/debts (欠费，固定首页/未结清)
 * - /api/admin/credits/stats (概览统计)
 *
 * 分页、筛选操作仍由各独立 API 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllPackages, getRedemptionCodes, getAdminDebts, getAdminOverviewStats } from '$lib/server/credits';
import { isAdmin } from '$lib/server/auth-utils';

const CODES_LIMIT = 10;
const DEBTS_LIMIT = 20;

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
		const [packages, codesResult, debtsResult, stats] = await Promise.all([
			getAllPackages(),
			getRedemptionCodes(CODES_LIMIT, 0),
			getAdminDebts(DEBTS_LIMIT, 0, 'false'),
			getAdminOverviewStats()
		]);

		return json({
			packages,
			codes: { items: codesResult.codes, total: codesResult.total },
			debts: { items: debtsResult.debts, total: debtsResult.total },
			stats
		});
	} catch (error) {
		console.error('获取管理员概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
