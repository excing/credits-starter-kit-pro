/**
 * Dashboard 概览统计 API
 * GET /api/user/credits/dashboard-stats
 *
 * 仅返回 /dashboard 页面所需的轻量数据（余额 + 统计摘要），
 * 避免与 /api/user/credits/overview（credits 页面专用）重复请求。
 *
 * 查询：getUserActivePackages + getUserCreditStats = 2 次 DB 查询
 * 余额由 activePackages 在应用层计算，省去原先的 getUserBalance 查询。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUserActivePackages,
	getUserCreditStats,
	calcBalanceFromPackages
} from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return json({ error: '未授权' }, { status: 401 });
	}

	try {
		const [activePackages, stats] = await Promise.all([
			getUserActivePackages(userId),
			getUserCreditStats(userId)
		]);

		return json({
			balance: calcBalanceFromPackages(activePackages),
			activePackages: activePackages.length,
			stats
		});
	} catch (error) {
		console.error('获取 Dashboard 统计失败:', error);
		return json({ error: '获取统计失败' }, { status: 500 });
	}
};
