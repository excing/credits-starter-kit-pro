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
import { PAGINATION, REDEMPTION_CODE_STATUS } from '$lib/config/constants';
import { errorResponse, ForbiddenError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return errorResponse(new ForbiddenError());
	}

	try {
		const [packagesResult, codesResult, snapshotCounts] = await Promise.all([
			getAllPackages(),
			getRedemptionCodes(PAGINATION.DEFAULT_LIMIT, 0, { status: REDEMPTION_CODE_STATUS.ACTIVE }),
			getCodePageCounts()
		]);

		return json({
			packages: packagesResult.packages,
			codes: { items: codesResult.codes, total: codesResult.total },
			snapshotCounts
		});
	} catch (error) {
		return errorResponse(error, '获取概览失败');
	}
};
