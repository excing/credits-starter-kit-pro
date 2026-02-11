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
import { errorResponse } from '$lib/server/errors';

export const GET: RequestHandler = async () => {
	try {
		const [stats, counts] = await Promise.all([
			getAdminOverviewStats(),
			getAdminOverviewCounts()
		]);

		return json({ stats, counts });
	} catch (error) {
		return errorResponse(error, '获取概览失败');
	}
};
