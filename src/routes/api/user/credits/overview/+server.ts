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

const HISTORY_LIMIT = 20;

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return json({ error: '未授权' }, { status: 401 });
	}

	try {
		const [activePackages, inactivePackages, transactions, debts, stats] = await Promise.all([
			getUserActivePackages(userId),
			getUserInactivePackages(userId),
			getUserTransactions(userId, HISTORY_LIMIT, 0),
			getUserDebts(userId, false),
			getUserCreditStats(userId)
		]);

		return json({
			balance: calcBalanceFromPackages(activePackages),
			activePackages: activePackages.length,
			stats,
			transactions,
			packages: activePackages,
			inactivePackages,
			debts,
			debtsTotal: debts.length,
			debtsUnsettledCount: debts.filter((d) => !d.isSettled).length
		});
	} catch (error) {
		console.error('获取积分概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
