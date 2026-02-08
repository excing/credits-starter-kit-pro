/**
 * Dashboard 概览统计 API
 * GET /api/user/credits/dashboard-stats
 *
 * 仅返回 /dashboard 页面所需的轻量数据（余额 + 统计摘要），
 * 避免与 /api/user/credits/overview（credits 页面专用）重复请求。
 *
 * 查询：getUserBalance + getUserActivePackages + getUserCreditStats = 3 次 DB 查询
 * 对比 overview 的 6 次 DB 查询，减少了 transactions / inactivePackages / debts。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUserBalance,
	getUserActivePackages,
	getUserCreditStats
} from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return json({ error: '未授权' }, { status: 401 });
	}

	try {
		const [balance, activePackages, stats] = await Promise.all([
			getUserBalance(userId),
			getUserActivePackages(userId),
			getUserCreditStats(userId)
		]);

		return json({
			balance,
			activePackages: activePackages.length,
			stats
		});
	} catch (error) {
		console.error('获取 Dashboard 统计失败:', error);
		return json({ error: '获取统计失败' }, { status: 500 });
	}
};
