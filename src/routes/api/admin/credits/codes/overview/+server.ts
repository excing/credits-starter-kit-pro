/**
 * 管理员兑换码页面聚合 API
 * GET /api/admin/credits/codes/overview
 *
 * 将以下请求合并为 1 个（用于页面初始加载）：
 * - 套餐列表（生成兑换码需要）
 * - 兑换码列表（默认加载"有效"状态）
 * - 固定的汇总计数（兑换码总数 + 总兑换次数，进入页面后固定不变）
 *
 * 兑换历史使用懒加载，用户点击 Tab 时由 /api/admin/credits/codes/history 加载。
 * 分页/筛选操作仍由各独立 API 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllPackages, getRedemptionCodes, getCodePageCounts } from '$lib/server/credits';
import { isAdmin } from '$lib/server/auth-utils';

const CODES_LIMIT = 10;

export const GET: RequestHandler = async ({ locals }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const [packages, codesResult, snapshotCounts] = await Promise.all([
			getAllPackages(),
			getRedemptionCodes(CODES_LIMIT, 0, { status: 'active' }),
			getCodePageCounts()
		]);

		return json({
			packages,
			codes: { items: codesResult.codes, total: codesResult.total },
			snapshotCounts
		});
	} catch (error) {
		console.error('获取兑换码概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
