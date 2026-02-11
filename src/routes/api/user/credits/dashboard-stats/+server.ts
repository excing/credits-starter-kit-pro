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
	getUserMonthlySpending,
	calcBalanceFromPackages
} from '$lib/server/credits';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return errorResponse(new UnauthorizedError());
	}

	try {
		const [activePackages, stats, monthlySpending] = await Promise.all([
			getUserActivePackages(userId),
			getUserCreditStats(userId),
			getUserMonthlySpending(userId)
		]);

		return json({
			balance: calcBalanceFromPackages(activePackages),
			activePackages: activePackages.length,
			stats,
			monthlySpending
		});
	} catch (error) {
		return errorResponse(error, '获取统计失败');
	}
};
