/**
 * 用户积分概览聚合 API
 * GET /api/user/credits/overview
 *
 * 将以下 5 个请求合并为 1 个（仅用于页面初始加载）：
 * - /api/user/credits (余额 —— 由 activePackages 在应用层计算，无额外 DB 查询)
 * - /api/user/credits/stats (统计)
 * - /api/user/credits/history (交易历史，固定前20条)
 * - /api/user/credits/packages (套餐)
 * - /api/user/credits/debts (欠费)
 *
 * 分页操作仍由各独立 API 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUserActivePackages,
	getUserInactivePackages,
	getUserTransactions,
	getUserDebts,
	getUserCreditStats,
	calcBalanceFromPackages
} from '$lib/server/credits';
import { PAGINATION } from '$lib/config/constants';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return errorResponse(new UnauthorizedError());
	}

	try {
		const [activePackages, inactivePackages, transactionsResult, debtsResult, stats] = await Promise.all([
			getUserActivePackages(userId),
			getUserInactivePackages(userId),
			getUserTransactions(userId, PAGINATION.DEFAULT_LIMIT, 0),
			getUserDebts(userId, false),
			getUserCreditStats(userId)
		]);

		return json({
			balance: calcBalanceFromPackages(activePackages),
			activePackages: activePackages.length,
			stats,
			transactions: transactionsResult.transactions,
			transactionsTotal: transactionsResult.total,
			packages: activePackages,
			inactivePackages,
			debts: debtsResult.debts,
			debtsTotal: debtsResult.total,
			debtsUnsettledCount: debtsResult.debts.filter((d) => !d.isSettled).length
		});
	} catch (error) {
		return errorResponse(error, '获取概览失败');
	}
};
